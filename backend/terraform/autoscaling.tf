# Auto Scaling Configuration for ECS Services

# Application Auto Scaling Target for Main App
resource "aws_appautoscaling_target" "ecs_app" {
  max_capacity       = var.ecs_max_capacity
  min_capacity       = var.ecs_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-app-autoscaling-target"
    Environment = var.environment
  }
}

# CPU-based scaling policy for Main App
resource "aws_appautoscaling_policy" "ecs_app_cpu" {
  name               = "${var.project_name}-${var.environment}-app-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_app.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_app.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_app.service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 300
  }
  
  depends_on = [aws_appautoscaling_target.ecs_app]
}

# Memory-based scaling policy for Main App
resource "aws_appautoscaling_policy" "ecs_app_memory" {
  name               = "${var.project_name}-${var.environment}-app-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_app.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_app.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_app.service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    
    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 300
  }
  
  depends_on = [aws_appautoscaling_target.ecs_app]
}

# Application Auto Scaling Target for AI Engine
resource "aws_appautoscaling_target" "ecs_ai_engine" {
  max_capacity       = 6
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.ai_engine.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-ai-engine-autoscaling-target"
    Environment = var.environment
  }
}

# CPU-based scaling policy for AI Engine
resource "aws_appautoscaling_policy" "ecs_ai_engine_cpu" {
  name               = "${var.project_name}-${var.environment}-ai-engine-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_ai_engine.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_ai_engine.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_ai_engine.service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    
    target_value       = 60.0
    scale_in_cooldown  = 600
    scale_out_cooldown = 300
  }
  
  depends_on = [aws_appautoscaling_target.ecs_ai_engine]
}

# Memory-based scaling policy for AI Engine
resource "aws_appautoscaling_policy" "ecs_ai_engine_memory" {
  name               = "${var.project_name}-${var.environment}-ai-engine-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_ai_engine.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_ai_engine.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_ai_engine.service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    
    target_value       = 70.0
    scale_in_cooldown  = 600
    scale_out_cooldown = 300
  }
  
  depends_on = [aws_appautoscaling_target.ecs_ai_engine]
}

# Custom metric-based scaling for request count
resource "aws_appautoscaling_policy" "ecs_app_request_count" {
  name               = "${var.project_name}-${var.environment}-app-request-count-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_app.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_app.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_app.service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.app.arn_suffix}"
    }
    
    target_value       = 1000.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 300
  }
  
  depends_on = [aws_appautoscaling_target.ecs_app]
}

# Scheduled scaling for predictable traffic patterns
resource "aws_appautoscaling_scheduled_action" "scale_up_morning" {
  name               = "${var.project_name}-${var.environment}-scale-up-morning"
  service_namespace  = aws_appautoscaling_target.ecs_app.service_namespace
  resource_id        = aws_appautoscaling_target.ecs_app.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_app.scalable_dimension
  
  schedule = "cron(0 8 * * ? *)"  # 8 AM UTC daily
  
  scalable_target_action {
    min_capacity = var.ecs_desired_count + 2
    max_capacity = var.ecs_max_capacity
  }
  
  depends_on = [aws_appautoscaling_target.ecs_app]
}

resource "aws_appautoscaling_scheduled_action" "scale_down_evening" {
  name               = "${var.project_name}-${var.environment}-scale-down-evening"
  service_namespace  = aws_appautoscaling_target.ecs_app.service_namespace
  resource_id        = aws_appautoscaling_target.ecs_app.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_app.scalable_dimension
  
  schedule = "cron(0 20 * * ? *)"  # 8 PM UTC daily
  
  scalable_target_action {
    min_capacity = var.ecs_min_capacity
    max_capacity = var.ecs_max_capacity
  }
  
  depends_on = [aws_appautoscaling_target.ecs_app]
}

# CloudWatch alarms for ECS scaling monitoring
resource "aws_cloudwatch_metric_alarm" "ecs_app_high_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-ecs-app-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors ECS app CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    ServiceName = aws_ecs_service.app.name
    ClusterName = aws_ecs_cluster.main.name
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-ecs-app-high-cpu-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "ecs_app_high_memory" {
  alarm_name          = "${var.project_name}-${var.environment}-ecs-app-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "90"
  alarm_description   = "This metric monitors ECS app memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    ServiceName = aws_ecs_service.app.name
    ClusterName = aws_ecs_cluster.main.name
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-ecs-app-high-memory-alarm"
  }
}

# Auto Scaling for RDS (if needed)
# resource "aws_appautoscaling_target" "rds_replica" {
#   max_capacity       = 5
#   min_capacity       = 1
#   resource_id        = "cluster:${aws_rds_cluster.main.cluster_identifier}"
#   scalable_dimension = "rds:cluster:ReadReplicaCount"
#   service_namespace  = "rds"
# }

# # RDS Aurora Auto Scaling Policy
# resource "aws_appautoscaling_policy" "rds_replica_cpu" {
#   name               = "${var.project_name}-${var.environment}-rds-replica-scaling"
#   policy_type        = "TargetTrackingScaling"
#   resource_id        = aws_appautoscaling_target.rds_replica.resource_id
#   scalable_dimension = aws_appautoscaling_target.rds_replica.scalable_dimension
#   service_namespace  = aws_appautoscaling_target.rds_replica.service_namespace

#   target_tracking_scaling_policy_configuration {
#     predefined_metric_specification {
#       predefined_metric_type = "RDSReaderAverageCPUUtilization"
#     }

#     target_value       = 70.0
#     scale_in_cooldown  = 300
#     scale_out_cooldown = 300
#   }
# }