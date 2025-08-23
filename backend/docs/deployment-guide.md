# HP Analysis System - Deployment Guide

## Overview

This guide covers the complete deployment process for the HP Analysis System, including infrastructure setup, CI/CD pipeline configuration, monitoring, security, and disaster recovery.

## Prerequisites

### Required Tools
- Terraform >= 1.0
- AWS CLI >= 2.0
- Docker >= 20.0
- Node.js >= 18.0
- Python >= 3.9
- Git

### AWS Setup
1. AWS account with appropriate IAM permissions
2. AWS CLI configured with credentials
3. S3 bucket for Terraform state
4. DynamoDB table for Terraform locking

### Required Secrets
- GitHub Secrets:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `SENTRY_DSN`
  - `SNYK_TOKEN`
  - `SLACK_WEBHOOK_URL`
  - `CODECOV_TOKEN`

## Infrastructure Deployment

### 1. Initial Setup

```bash
cd terraform/

# Initialize Terraform
terraform init

# Review planned changes
terraform plan -var-file="environments/production.tfvars"

# Apply infrastructure
terraform apply -var-file="environments/production.tfvars"
```

### 2. Domain Configuration

1. Update Route53 DNS records
2. Verify SSL certificate validation
3. Configure CloudFront distribution

### 3. Database Setup

```bash
# Run database migrations
npm run migrate:deploy

# Seed initial data (if needed)
npm run seed:production
```

## Application Deployment

### Using GitHub Actions (Recommended)

1. **Automatic Deployment**
   - Push to `main` branch triggers production deployment
   - Push to `staging` branch triggers staging deployment

2. **Manual Deployment**
   ```bash
   # Trigger manual deployment via GitHub UI
   # Go to Actions tab → CI/CD Pipeline → Run workflow
   ```

### Using Deployment Script

```bash
# Deploy to staging
./scripts/deploy.sh -e staging deploy

# Deploy to production
./scripts/deploy.sh -e production deploy

# Check deployment status
./scripts/deploy.sh -e production status

# View logs
./scripts/deploy.sh -e production logs
```

## Environment Configuration

### Production Environment

Key characteristics:
- High availability across multiple AZs
- Auto-scaling enabled
- Production-grade monitoring
- Strict security policies
- Automated backups

### Staging Environment

Key characteristics:
- Single AZ deployment (cost optimization)
- Relaxed rate limiting for testing
- Debug logging enabled
- Experimental features enabled

## Monitoring Setup

### DataDog Configuration

1. **Agent Installation**
   ```bash
   kubectl apply -f monitoring/datadog-agent.yaml
   ```

2. **Dashboard Setup**
   - Import dashboards from `monitoring/grafana-dashboards.json`
   - Configure alerts based on `monitoring/alert-rules.yml`

### Sentry Configuration

1. **Application Integration**
   - Configure DSN in environment variables
   - Deploy with Sentry middleware enabled

2. **Error Monitoring**
   - Real-time error tracking
   - Performance monitoring
   - Release tracking

## Security Implementation

### WAF Configuration

AWS WAF is automatically configured via Terraform with:
- SQL injection protection
- XSS protection
- Rate limiting
- Geo-blocking
- IP reputation filtering

### Security Headers

Security headers are automatically applied via:
- CloudFront security functions
- Application middleware
- Content Security Policy

### Vulnerability Scanning

```bash
# Run comprehensive security scan
node security/vulnerability-scanner.js

# Check scan results
cat security-reports/security-report-latest.json
```

## Backup and Disaster Recovery

### Automated Backups

- **Database**: Daily automated backups with 7-day retention
- **Application Data**: Cross-region replication
- **Infrastructure**: Terraform state backup

### Disaster Recovery Procedures

1. **Database Recovery**
   ```bash
   aws backup start-restore-job \
     --recovery-point-arn <arn> \
     --metadata '{"DBInstanceIdentifier": "restored-db"}'
   ```

2. **Application Recovery**
   ```bash
   # Rollback to previous version
   ./scripts/deploy.sh -e production rollback
   ```

3. **Infrastructure Recovery**
   ```bash
   # Restore from Terraform state backup
   terraform init
   terraform apply
   ```

## Scaling Configuration

### Auto Scaling Triggers

- **CPU Utilization**: Scale at 70% CPU
- **Memory Utilization**: Scale at 80% memory
- **Request Count**: Scale at 1000 requests per target

### Manual Scaling

```bash
# Scale ECS service
aws ecs update-service \
  --cluster hp-analysis-production-cluster \
  --service hp-analysis-production-app \
  --desired-count 5
```

## Performance Optimization

### Caching Strategy

- **CloudFront**: Static assets (1 hour TTL)
- **API Gateway**: API responses (5 minutes TTL)
- **Redis**: Session data and frequently accessed data

### Database Optimization

- **Read Replicas**: Automatically configured for read scaling
- **Connection Pooling**: Configured via Prisma
- **Query Optimization**: Monitored via Performance Insights

## Troubleshooting

### Common Issues

1. **Deployment Failures**
   ```bash
   # Check ECS service events
   aws ecs describe-services --cluster <cluster> --services <service>
   
   # Check task logs
   aws logs tail /ecs/hp-analysis-production-app
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connectivity
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Check RDS metrics
   aws rds describe-db-instances --db-instance-identifier hp-analysis-production-db
   ```

3. **High Error Rates**
   ```bash
   # Check application logs
   ./scripts/deploy.sh -e production logs
   
   # Check Sentry for error details
   # View CloudWatch metrics
   ```

### Health Checks

- **Application Health**: `/health` endpoint
- **Database Health**: Connection pool status
- **Redis Health**: Ping response
- **External Services**: Dependency checks

## Maintenance Procedures

### Regular Maintenance

1. **Security Updates**
   - Weekly dependency scans
   - Monthly base image updates
   - Quarterly security audits

2. **Performance Reviews**
   - Monthly performance analysis
   - Quarterly capacity planning
   - Annual architecture review

### Emergency Procedures

1. **Incident Response**
   - Automatic alerting via PagerDuty/Slack
   - Escalation procedures documented
   - Post-incident reviews conducted

2. **Emergency Rollback**
   ```bash
   # Quick rollback procedure
   ./scripts/deploy.sh -e production rollback
   ```

## Cost Optimization

### Resource Optimization

- **Scheduled Scaling**: Reduced capacity during low-traffic periods
- **Reserved Instances**: For predictable workloads
- **Spot Instances**: For non-critical background tasks

### Monitoring Costs

- AWS Cost Explorer integration
- Budget alerts configured
- Monthly cost reviews

## Compliance and Auditing

### Logging Strategy

- **Application Logs**: Structured JSON logging
- **Access Logs**: All API requests logged
- **Audit Logs**: Administrative actions tracked

### Compliance Requirements

- **Data Retention**: Configured per data type
- **Access Controls**: Role-based permissions
- **Encryption**: Data encrypted at rest and in transit

## Support and Documentation

### Support Channels

- **Emergency**: PagerDuty alerts
- **General**: Slack `#devops` channel
- **Documentation**: Confluence wiki

### Runbooks

- [Database Maintenance Runbook](runbooks/database-maintenance.md)
- [Security Incident Response](runbooks/security-incident.md)
- [Performance Tuning Guide](runbooks/performance-tuning.md)

## References

- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [DataDog Integration Guide](https://docs.datadoghq.com/integrations/)
- [Sentry Node.js Guide](https://docs.sentry.io/platforms/node/)