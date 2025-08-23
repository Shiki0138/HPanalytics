# Output values for the infrastructure

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "Hosted zone ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

output "rds_read_replica_endpoint" {
  description = "RDS read replica endpoint"
  value       = aws_db_instance.read_replica.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = aws_elasticache_replication_group.main.port
}

output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "ecr_app_repository_url" {
  description = "URL of the ECR repository for the main app"
  value       = aws_ecr_repository.app.repository_url
}

output "ecr_ai_engine_repository_url" {
  description = "URL of the ECR repository for the AI engine"
  value       = aws_ecr_repository.ai_engine.repository_url
}

output "secrets_manager_db_secret_arn" {
  description = "ARN of the Secrets Manager secret for database credentials"
  value       = aws_secretsmanager_secret.db_credentials.arn
  sensitive   = true
}

output "secrets_manager_redis_secret_arn" {
  description = "ARN of the Secrets Manager secret for Redis credentials"
  value       = aws_secretsmanager_secret.redis_credentials.arn
  sensitive   = true
}

output "secrets_manager_app_secret_arn" {
  description = "ARN of the Secrets Manager secret for application secrets"
  value       = aws_secretsmanager_secret.app_secrets.arn
  sensitive   = true
}

output "backup_vault_arn" {
  description = "ARN of the backup vault"
  value       = aws_backup_vault.main.arn
}

output "backup_plan_id" {
  description = "ID of the backup plan"
  value       = aws_backup_plan.main.id
}

output "s3_backup_bucket_name" {
  description = "Name of the S3 backup bucket"
  value       = aws_s3_bucket.backups.bucket
}

output "s3_static_assets_bucket_name" {
  description = "Name of the S3 static assets bucket"
  value       = aws_s3_bucket.static_assets.bucket
}

output "waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = var.enable_waf ? aws_wafv2_web_acl.main[0].arn : null
}

output "cloudwatch_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "sns_alerts_topic_arn" {
  description = "ARN of the SNS alerts topic"
  value       = aws_sns_topic.alerts.arn
}

output "sns_critical_alerts_topic_arn" {
  description = "ARN of the SNS critical alerts topic"
  value       = aws_sns_topic.critical_alerts.arn
}

output "ssl_certificate_arn" {
  description = "ARN of the SSL certificate"
  value       = var.ssl_certificate_arn != "" ? var.ssl_certificate_arn : try(aws_acm_certificate.main[0].arn, "")
}

output "domain_name" {
  description = "Domain name for the application"
  value       = var.domain_name
}

output "app_url" {
  description = "Application URL"
  value       = var.ssl_certificate_arn == "" ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.main.domain_name}"
}

# Security Group IDs
output "security_group_alb_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "security_group_ecs_id" {
  description = "ID of the ECS security group"
  value       = aws_security_group.ecs.id
}

output "security_group_rds_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}

output "security_group_redis_id" {
  description = "ID of the Redis security group"
  value       = aws_security_group.redis.id
}

# IAM Role ARNs
output "ecs_execution_role_arn" {
  description = "ARN of the ECS execution role"
  value       = aws_iam_role.ecs_execution_role.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task_role.arn
}

# Monitoring
output "health_check_lambda_arn" {
  description = "ARN of the health check Lambda function"
  value       = aws_lambda_function.health_check.arn
}

output "backup_verification_lambda_arn" {
  description = "ARN of the backup verification Lambda function"
  value       = aws_lambda_function.backup_verification.arn
}

# Auto Scaling
output "app_autoscaling_target_resource_id" {
  description = "Resource ID of the app auto scaling target"
  value       = aws_appautoscaling_target.ecs_app.resource_id
}

output "ai_engine_autoscaling_target_resource_id" {
  description = "Resource ID of the AI engine auto scaling target"
  value       = aws_appautoscaling_target.ecs_ai_engine.resource_id
}

# Deployment Information
output "deployment_info" {
  description = "Key deployment information"
  value = {
    environment                = var.environment
    aws_region                = var.aws_region
    app_repository_url         = aws_ecr_repository.app.repository_url
    ai_engine_repository_url   = aws_ecr_repository.ai_engine.repository_url
    ecs_cluster_name          = aws_ecs_cluster.main.name
    alb_dns_name              = aws_lb.main.dns_name
    cloudfront_domain_name    = aws_cloudfront_distribution.main.domain_name
  }
}