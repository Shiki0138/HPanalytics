# Monitoring and Alerting Configuration

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-alerts"
    Environment = var.environment
  }
}

# SNS Topic for Critical Alerts
resource "aws_sns_topic" "critical_alerts" {
  name = "${var.project_name}-${var.environment}-critical-alerts"
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-critical-alerts"
    Environment = var.environment
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}-dashboard"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.app.name, "ClusterName", aws_ecs_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.main.arn_suffix],
            [".", "RequestCount", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ECS Service Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main.id],
            [".", "DatabaseConnections", ".", "."],
            [".", "ReadLatency", ".", "."],
            [".", "WriteLatency", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "RDS Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", "${aws_elasticache_replication_group.main.replication_group_id}-001"],
            [".", "DatabaseMemoryUsagePercentage", ".", "."],
            [".", "NetworkBytesIn", ".", "."],
            [".", "NetworkBytesOut", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ElastiCache Redis Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/CloudFront", "Requests", "DistributionId", aws_cloudfront_distribution.main.id],
            [".", "BytesDownloaded", ".", "."],
            [".", "4xxErrorRate", ".", "."],
            [".", "5xxErrorRate", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "CloudFront Metrics"
          period  = 300
        }
      }
    ]
  })
}

# Application Load Balancer Alarms
resource "aws_cloudwatch_metric_alarm" "alb_response_time" {
  alarm_name          = "${var.project_name}-${var.environment}-alb-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "1.0"
  alarm_description   = "This metric monitors ALB response time"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-alb-response-time-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors ALB 5xx errors"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]
  
  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-alb-5xx-errors-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_healthy_hosts" {
  alarm_name          = "${var.project_name}-${var.environment}-alb-healthy-hosts"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "2"
  alarm_description   = "This metric monitors healthy host count"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]
  
  dimensions = {
    TargetGroup  = aws_lb_target_group.app.arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-alb-healthy-hosts-alarm"
  }
}

# CloudFront Alarms
resource "aws_cloudwatch_metric_alarm" "cloudfront_5xx_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-cloudfront-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = "5"
  alarm_description   = "This metric monitors CloudFront 5xx error rate"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    DistributionId = aws_cloudfront_distribution.main.id
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-cloudfront-5xx-errors-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "cloudfront_origin_latency" {
  alarm_name          = "${var.project_name}-${var.environment}-cloudfront-origin-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "OriginLatency"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = "5000"
  alarm_description   = "This metric monitors CloudFront origin latency"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    DistributionId = aws_cloudfront_distribution.main.id
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-cloudfront-origin-latency-alarm"
  }
}

# Custom Application Metrics (via CloudWatch Logs Insights)
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  name           = "${var.project_name}-${var.environment}-error-count"
  log_group_name = aws_cloudwatch_log_group.ecs_app.name
  pattern        = "[timestamp, request_id, level=\"ERROR\", ...]"
  
  metric_transformation {
    name      = "ErrorCount"
    namespace = "HP-Analysis/Application"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "application_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-application-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ErrorCount"
  namespace           = "HP-Analysis/Application"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors application error count"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"
  
  tags = {
    Name = "${var.project_name}-${var.environment}-application-errors-alarm"
  }
}

# Log Insights Queries for common issues
resource "aws_cloudwatch_query_definition" "error_analysis" {
  name = "${var.project_name}-${var.environment}-error-analysis"
  
  log_group_names = [
    aws_cloudwatch_log_group.ecs_app.name,
    aws_cloudwatch_log_group.ecs_ai_engine.name
  ]
  
  query_string = <<EOF
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by bin(5m)
| sort @timestamp desc
EOF
}

resource "aws_cloudwatch_query_definition" "slow_requests" {
  name = "${var.project_name}-${var.environment}-slow-requests"
  
  log_group_names = [
    aws_cloudwatch_log_group.ecs_app.name
  ]
  
  query_string = <<EOF
fields @timestamp, @message
| filter @message like /response_time/ and @message like /ms/
| parse @message /response_time: (?<response_time>\d+)ms/
| filter response_time > 1000
| stats count() by bin(5m)
| sort @timestamp desc
EOF
}

# X-Ray Tracing (optional)
resource "aws_xray_sampling_rule" "main" {
  rule_name      = "${var.project_name}-${var.environment}-sampling"
  priority       = 9000
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.05
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-xray-sampling"
    Environment = var.environment
  }
}

# EventBridge for custom monitoring events
resource "aws_cloudwatch_event_rule" "ecs_state_change" {
  name        = "${var.project_name}-${var.environment}-ecs-state-change"
  description = "Capture ECS container state changes"
  
  event_pattern = jsonencode({
    source      = ["aws.ecs"]
    detail-type = ["ECS Container Instance State Change", "ECS Task State Change"]
    detail = {
      clusterArn = [aws_ecs_cluster.main.arn]
    }
  })
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-ecs-state-change"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_event_target" "sns" {
  rule      = aws_cloudwatch_event_rule.ecs_state_change.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.alerts.arn
}

# Lambda function for custom health checks
resource "aws_lambda_function" "health_check" {
  filename         = "health_check.zip"
  function_name    = "${var.project_name}-${var.environment}-health-check"
  role            = aws_iam_role.lambda_health_check.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.health_check_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30
  
  environment {
    variables = {
      ALB_DNS_NAME = aws_lb.main.dns_name
      SNS_TOPIC_ARN = aws_sns_topic.critical_alerts.arn
    }
  }
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-health-check"
    Environment = var.environment
  }
}

# Create health check Lambda zip file
data "archive_file" "health_check_zip" {
  type        = "zip"
  output_path = "health_check.zip"
  source {
    content = <<EOF
const AWS = require('aws-sdk');
const https = require('https');

const sns = new AWS.SNS();

exports.handler = async (event) => {
    const albDnsName = process.env.ALB_DNS_NAME;
    const snsTopicArn = process.env.SNS_TOPIC_ARN;
    
    try {
        const response = await checkHealth(`https://${albDnsName}/health`);
        
        if (response.statusCode !== 200) {
            await sendAlert(`Health check failed: HTTP ${response.statusCode}`);
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({ status: 'OK', response: response.statusCode })
        };
    } catch (error) {
        await sendAlert(`Health check error: ${error.message}`);
        return {
            statusCode: 500,
            body: JSON.stringify({ status: 'ERROR', error: error.message })
        };
    }
};

function checkHealth(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 10000 }, (res) => {
            resolve({ statusCode: res.statusCode });
        });
        
        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Request timeout')));
    });
}

async function sendAlert(message) {
    await sns.publish({
        TopicArn: process.env.SNS_TOPIC_ARN,
        Message: message,
        Subject: 'HP Analysis System Health Check Alert'
    }).promise();
}
EOF
    filename = "index.js"
  }
}

# IAM role for Lambda health check
resource "aws_iam_role" "lambda_health_check" {
  name = "${var.project_name}-${var.environment}-lambda-health-check-role"
  
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

resource "aws_iam_role_policy_attachment" "lambda_health_check_basic" {
  role       = aws_iam_role.lambda_health_check.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_health_check_sns" {
  name = "${var.project_name}-${var.environment}-lambda-sns-policy"
  role = aws_iam_role.lambda_health_check.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.critical_alerts.arn
      }
    ]
  })
}

# EventBridge rule to trigger health check every 5 minutes
resource "aws_cloudwatch_event_rule" "health_check_schedule" {
  name                = "${var.project_name}-${var.environment}-health-check-schedule"
  description         = "Trigger health check every 5 minutes"
  schedule_expression = "rate(5 minutes)"
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-health-check-schedule"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_event_target" "health_check_lambda" {
  rule      = aws_cloudwatch_event_rule.health_check_schedule.name
  target_id = "HealthCheckLambdaTarget"
  arn       = aws_lambda_function.health_check.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.health_check.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.health_check_schedule.arn
}