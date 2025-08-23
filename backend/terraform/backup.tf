# Backup and Disaster Recovery Configuration

# S3 Bucket for Backups
resource "aws_s3_bucket" "backups" {
  bucket        = "${var.project_name}-${var.environment}-backups-${random_id.backup_suffix.hex}"
  force_destroy = false
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-backups"
    Environment = var.environment
    Purpose     = "Backup"
  }
}

resource "random_id" "backup_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.backup.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  
  rule {
    id     = "backup_lifecycle"
    status = "Enabled"
    
    # Transition to IA after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    # Transition to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    # Transition to Deep Archive after 365 days
    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }
    
    # Delete old versions after 2555 days (7 years)
    noncurrent_version_expiration {
      noncurrent_days = 2555
    }
    
    # Delete incomplete multipart uploads after 7 days
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# KMS Key for Backup Encryption
resource "aws_kms_key" "backup" {
  description             = "KMS key for backup encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow AWS Backup Service"
        Effect = "Allow"
        Principal = {
          Service = [
            "backup.amazonaws.com",
            "rds.amazonaws.com"
          ]
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:CreateGrant"
        ]
        Resource = "*"
      }
    ]
  })
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-backup-key"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "backup" {
  name          = "alias/${var.project_name}-${var.environment}-backup"
  target_key_id = aws_kms_key.backup.key_id
}

# AWS Backup Vault
resource "aws_backup_vault" "main" {
  name        = "${var.project_name}-${var.environment}-backup-vault"
  kms_key_arn = aws_kms_key.backup.arn
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-backup-vault"
    Environment = var.environment
  }
}

# Backup Plan
resource "aws_backup_plan" "main" {
  name = "${var.project_name}-${var.environment}-backup-plan"
  
  # Daily backups with 30-day retention
  rule {
    rule_name         = "daily_backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 2 * * ? *)"  # 2 AM UTC daily
    
    start_window      = 120  # 2 hours
    completion_window = 480  # 8 hours
    
    lifecycle {
      cold_storage_after = 30
      delete_after      = 365
    }
    
    recovery_point_tags = {
      BackupType  = "daily"
      Environment = var.environment
    }
    
    copy_action {
      destination_vault_arn = aws_backup_vault.cross_region[0].arn
      
      lifecycle {
        cold_storage_after = 30
        delete_after      = 365
      }
    }
  }
  
  # Weekly backups with 1-year retention
  rule {
    rule_name         = "weekly_backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 ? * SUN *)"  # 3 AM UTC every Sunday
    
    start_window      = 120
    completion_window = 480
    
    lifecycle {
      cold_storage_after = 30
      delete_after      = 2555  # 7 years
    }
    
    recovery_point_tags = {
      BackupType  = "weekly"
      Environment = var.environment
    }
    
    copy_action {
      destination_vault_arn = aws_backup_vault.cross_region[0].arn
      
      lifecycle {
        cold_storage_after = 30
        delete_after      = 2555
      }
    }
  }
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-backup-plan"
    Environment = var.environment
  }
}

# Cross-region backup vault for disaster recovery
resource "aws_backup_vault" "cross_region" {
  count    = 1
  provider = aws.backup_region
  
  name        = "${var.project_name}-${var.environment}-backup-vault-dr"
  kms_key_arn = aws_kms_key.backup_dr[0].arn
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-backup-vault-dr"
    Environment = var.environment
  }
}

# Cross-region KMS key
resource "aws_kms_key" "backup_dr" {
  count    = 1
  provider = aws.backup_region
  
  description             = "KMS key for cross-region backup encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-backup-key-dr"
    Environment = var.environment
  }
}

# Backup selection for RDS
resource "aws_backup_selection" "rds" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "${var.project_name}-${var.environment}-rds-backup-selection"
  plan_id      = aws_backup_plan.main.id
  
  resources = [
    aws_db_instance.main.arn,
    aws_db_instance.read_replica.arn
  ]
  
  condition {
    string_equals {
      key   = "aws:ResourceTag/Environment"
      value = var.environment
    }
  }
}

# Backup selection for EFS (if using EFS for file storage)
# resource "aws_backup_selection" "efs" {
#   iam_role_arn = aws_iam_role.backup.arn
#   name         = "${var.project_name}-${var.environment}-efs-backup-selection"
#   plan_id      = aws_backup_plan.main.id

#   resources = [
#     aws_efs_file_system.main.arn
#   ]
# }

# IAM role for AWS Backup
resource "aws_iam_role" "backup" {
  name = "${var.project_name}-${var.environment}-backup-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name = "${var.project_name}-${var.environment}-backup-role"
  }
}

resource "aws_iam_role_policy_attachment" "backup" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "backup_restore" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

# Lambda function for backup verification
resource "aws_lambda_function" "backup_verification" {
  filename         = "backup_verification.zip"
  function_name    = "${var.project_name}-${var.environment}-backup-verification"
  role            = aws_iam_role.backup_verification_lambda.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.backup_verification_zip.output_base64sha256
  runtime         = "python3.9"
  timeout         = 300
  
  environment {
    variables = {
      BACKUP_VAULT_NAME = aws_backup_vault.main.name
      SNS_TOPIC_ARN    = aws_sns_topic.alerts.arn
    }
  }
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-backup-verification"
    Environment = var.environment
  }
}

data "archive_file" "backup_verification_zip" {
  type        = "zip"
  output_path = "backup_verification.zip"
  source {
    content = <<EOF
import boto3
import json
from datetime import datetime, timedelta

backup_client = boto3.client('backup')
sns_client = boto3.client('sns')

def handler(event, context):
    vault_name = os.environ['BACKUP_VAULT_NAME']
    sns_topic_arn = os.environ['SNS_TOPIC_ARN']
    
    try:
        # Check for recent backups (last 25 hours)
        cutoff_time = datetime.now() - timedelta(hours=25)
        
        response = backup_client.list_recovery_points_by_backup_vault(
            BackupVaultName=vault_name,
            ByCreatedAfter=cutoff_time
        )
        
        if not response['RecoveryPoints']:
            message = f"No recent backups found in vault {vault_name}"
            send_alert(sns_topic_arn, message)
            return {
                'statusCode': 500,
                'body': json.dumps({'status': 'ERROR', 'message': message})
            }
        
        # Check backup status
        failed_backups = []
        for rp in response['RecoveryPoints']:
            if rp['Status'] == 'FAILED':
                failed_backups.append(rp['RecoveryPointArn'])
        
        if failed_backups:
            message = f"Failed backups detected: {failed_backups}"
            send_alert(sns_topic_arn, message)
            return {
                'statusCode': 500,
                'body': json.dumps({'status': 'ERROR', 'message': message})
            }
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'OK',
                'backup_count': len(response['RecoveryPoints'])
            })
        }
    
    except Exception as e:
        message = f"Backup verification failed: {str(e)}"
        send_alert(sns_topic_arn, message)
        return {
            'statusCode': 500,
            'body': json.dumps({'status': 'ERROR', 'error': str(e)})
        }

def send_alert(topic_arn, message):
    sns_client.publish(
        TopicArn=topic_arn,
        Message=message,
        Subject='HP Analysis System Backup Alert'
    )
EOF
    filename = "index.py"
  }
}

# IAM role for backup verification Lambda
resource "aws_iam_role" "backup_verification_lambda" {
  name = "${var.project_name}-${var.environment}-backup-verification-lambda-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "backup_verification_lambda_basic" {
  role       = aws_iam_role.backup_verification_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "backup_verification_lambda_permissions" {
  name = "${var.project_name}-${var.environment}-backup-verification-lambda-policy"
  role = aws_iam_role.backup_verification_lambda.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "backup:ListRecoveryPointsByBackupVault",
          "backup:DescribeRecoveryPoint"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.alerts.arn
      }
    ]
  })
}

# EventBridge rule to trigger backup verification daily
resource "aws_cloudwatch_event_rule" "backup_verification_schedule" {
  name                = "${var.project_name}-${var.environment}-backup-verification-schedule"
  description         = "Trigger backup verification daily"
  schedule_expression = "rate(1 day)"
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-backup-verification-schedule"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_event_target" "backup_verification_lambda" {
  rule      = aws_cloudwatch_event_rule.backup_verification_schedule.name
  target_id = "BackupVerificationLambdaTarget"
  arn       = aws_lambda_function.backup_verification.arn
}

resource "aws_lambda_permission" "allow_eventbridge_backup_verification" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backup_verification.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.backup_verification_schedule.arn
}

# Point-in-time recovery configuration for RDS is handled in rds.tf
# Additional backup automation can be added here

# Disaster Recovery Documentation (stored in S3)
resource "aws_s3_object" "dr_runbook" {
  bucket = aws_s3_bucket.backups.id
  key    = "disaster-recovery/runbook.md"
  content = templatefile("${path.module}/dr-runbook.md.tpl", {
    project_name     = var.project_name
    environment     = var.environment
    backup_vault    = aws_backup_vault.main.name
    rds_instance    = aws_db_instance.main.identifier
    ecs_cluster     = aws_ecs_cluster.main.name
  })
  content_type = "text/markdown"
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-dr-runbook"
    Environment = var.environment
  }
}

# DR Runbook template
resource "local_file" "dr_runbook_template" {
  filename = "${path.module}/dr-runbook.md.tpl"
  content  = <<EOF
# Disaster Recovery Runbook for ${project_name} ${environment}

## Overview
This document outlines the disaster recovery procedures for the HP Analysis System.

## Recovery Time Objective (RTO): 4 hours
## Recovery Point Objective (RPO): 24 hours

## Emergency Contacts
- DevOps Team: devops@example.com
- Security Team: security@example.com
- Management: management@example.com

## Backup Information
- **Backup Vault**: ${backup_vault}
- **RDS Instance**: ${rds_instance}
- **ECS Cluster**: ${ecs_cluster}

## Recovery Procedures

### 1. Database Recovery
```bash
# Restore RDS from latest backup
aws backup start-restore-job \
  --recovery-point-arn <recovery-point-arn> \
  --metadata '{
    "DBInstanceIdentifier": "${rds_instance}-restored",
    "DBSubnetGroupName": "${project_name}-${environment}-db-subnet-group"
  }' \
  --iam-role-arn <backup-service-role-arn>
```

### 2. Application Recovery
```bash
# Update ECS service to use restored database
aws ecs update-service \
  --cluster ${ecs_cluster} \
  --service ${project_name}-${environment}-app \
  --force-new-deployment
```

### 3. Verification Steps
1. Check application health endpoints
2. Verify database connectivity
3. Test critical application functionality
4. Monitor application logs

### 4. Rollback Procedures
If recovery fails, rollback to previous stable state:
1. Stop newly deployed services
2. Restore from previous backup
3. Update DNS records if necessary

## Testing Schedule
- DR drills: Quarterly
- Backup verification: Daily (automated)
- Recovery testing: Monthly
EOF
}