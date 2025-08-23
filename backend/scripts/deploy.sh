#!/bin/bash

# HP Analysis System Deployment Script
set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
AWS_REGION=${AWS_REGION:-us-west-2}
ENVIRONMENT=${ENVIRONMENT:-staging}
APP_VERSION=${APP_VERSION:-$(git rev-parse --short HEAD)}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS] COMMAND

Commands:
    build       Build Docker images
    push        Push images to ECR
    deploy      Deploy to ECS
    rollback    Rollback to previous version
    status      Check deployment status
    logs        View application logs
    validate    Validate deployment configuration

Options:
    -e, --environment ENV    Target environment (staging/production) [default: staging]
    -v, --version VERSION    Application version [default: git SHA]
    -r, --region REGION      AWS region [default: us-west-2]
    -d, --dry-run           Show what would be done without executing
    -h, --help              Show this help message

Examples:
    $0 -e production deploy
    $0 -e staging rollback
    $0 --dry-run -e production deploy
EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -v|--version)
                APP_VERSION="$2"
                shift 2
                ;;
            -r|--region)
                AWS_REGION="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            build|push|deploy|rollback|status|logs|validate)
                COMMAND="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done

    if [[ -z "${COMMAND:-}" ]]; then
        log_error "Command is required"
        usage
        exit 1
    fi
}

# Validate prerequisites
validate_prerequisites() {
    log_info "Validating prerequisites..."

    # Check required tools
    local required_tools=("aws" "docker" "jq" "git")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is required but not installed"
            exit 1
        fi
    done

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi

    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi

    # Validate environment
    if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
        log_error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
        exit 1
    fi

    log_success "Prerequisites validated"
}

# Set environment variables
set_environment_variables() {
    log_info "Setting environment variables..."
    
    export AWS_REGION
    export ENVIRONMENT
    export APP_VERSION
    
    # Set environment-specific variables
    case $ENVIRONMENT in
        production)
            export ECR_REGISTRY="$(aws sts get-caller-identity --query Account --output text).dkr.ecr.${AWS_REGION}.amazonaws.com"
            export ECS_CLUSTER="hp-analysis-production-cluster"
            export ECS_SERVICE_APP="hp-analysis-production-app"
            export ECS_SERVICE_AI="hp-analysis-production-ai-engine"
            export APP_IMAGE="${ECR_REGISTRY}/hp-analysis-production-app:${APP_VERSION}"
            export AI_IMAGE="${ECR_REGISTRY}/hp-analysis-production-ai-engine:${APP_VERSION}"
            ;;
        staging)
            export ECR_REGISTRY="$(aws sts get-caller-identity --query Account --output text).dkr.ecr.${AWS_REGION}.amazonaws.com"
            export ECS_CLUSTER="hp-analysis-staging-cluster"
            export ECS_SERVICE_APP="hp-analysis-staging-app"
            export ECS_SERVICE_AI="hp-analysis-staging-ai-engine"
            export APP_IMAGE="${ECR_REGISTRY}/hp-analysis-staging-app:${APP_VERSION}"
            export AI_IMAGE="${ECR_REGISTRY}/hp-analysis-staging-ai-engine:${APP_VERSION}"
            ;;
    esac
    
    log_success "Environment variables set for $ENVIRONMENT"
}

# Build Docker images
build_images() {
    log_info "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log_info "[DRY RUN] Would build images:"
        log_info "  Main app: $APP_IMAGE"
        log_info "  AI engine: $AI_IMAGE"
        return
    fi
    
    # Build main application image
    log_info "Building main application image..."
    docker build \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="$(git rev-parse HEAD)" \
        --build-arg NODE_ENV="$ENVIRONMENT" \
        -t "$APP_IMAGE" \
        -f Dockerfile \
        .
    
    # Build AI engine image
    log_info "Building AI engine image..."
    docker build \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="$(git rev-parse HEAD)" \
        --build-arg ENVIRONMENT="$ENVIRONMENT" \
        -t "$AI_IMAGE" \
        -f ai-engine/Dockerfile \
        ai-engine/
    
    log_success "Images built successfully"
}

# Push images to ECR
push_images() {
    log_info "Pushing images to ECR..."
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log_info "[DRY RUN] Would push images to ECR"
        return
    fi
    
    # Login to ECR
    log_info "Logging in to ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ECR_REGISTRY"
    
    # Push main app image
    log_info "Pushing main application image..."
    docker push "$APP_IMAGE"
    
    # Tag and push latest
    docker tag "$APP_IMAGE" "${ECR_REGISTRY}/hp-analysis-${ENVIRONMENT}-app:latest"
    docker push "${ECR_REGISTRY}/hp-analysis-${ENVIRONMENT}-app:latest"
    
    # Push AI engine image
    log_info "Pushing AI engine image..."
    docker push "$AI_IMAGE"
    
    # Tag and push latest
    docker tag "$AI_IMAGE" "${ECR_REGISTRY}/hp-analysis-${ENVIRONMENT}-ai-engine:latest"
    docker push "${ECR_REGISTRY}/hp-analysis-${ENVIRONMENT}-ai-engine:latest"
    
    log_success "Images pushed successfully"
}

# Deploy to ECS
deploy_to_ecs() {
    log_info "Deploying to ECS..."
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log_info "[DRY RUN] Would deploy to ECS cluster: $ECS_CLUSTER"
        return
    fi
    
    # Deploy main application service
    log_info "Deploying main application service..."
    deploy_ecs_service "$ECS_SERVICE_APP" "$APP_IMAGE"
    
    # Deploy AI engine service
    log_info "Deploying AI engine service..."
    deploy_ecs_service "$ECS_SERVICE_AI" "$AI_IMAGE"
    
    log_success "Deployment completed"
}

# Deploy specific ECS service
deploy_ecs_service() {
    local service_name="$1"
    local image_uri="$2"
    
    log_info "Deploying service: $service_name"
    
    # Get current task definition
    local task_def_arn
    task_def_arn=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER" \
        --services "$service_name" \
        --query 'services[0].taskDefinition' \
        --output text)
    
    # Create new task definition with updated image
    local new_task_def
    new_task_def=$(aws ecs describe-task-definition \
        --task-definition "$task_def_arn" \
        --query 'taskDefinition' | \
        jq --arg image "$image_uri" '
            del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy) |
            .containerDefinitions |= map(
                if .name == "app" or .name == "ai-engine" then
                    .image = $image
                else . end
            )'
    )
    
    # Register new task definition
    local new_task_def_arn
    new_task_def_arn=$(echo "$new_task_def" | \
        aws ecs register-task-definition --cli-input-json file:///dev/stdin \
        --query 'taskDefinition.taskDefinitionArn' --output text)
    
    log_info "Registered new task definition: $new_task_def_arn"
    
    # Update service
    aws ecs update-service \
        --cluster "$ECS_CLUSTER" \
        --service "$service_name" \
        --task-definition "$new_task_def_arn" > /dev/null
    
    log_info "Waiting for deployment to stabilize..."
    aws ecs wait services-stable \
        --cluster "$ECS_CLUSTER" \
        --services "$service_name"
    
    log_success "Service $service_name deployed successfully"
}

# Rollback deployment
rollback_deployment() {
    log_info "Rolling back deployment..."
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log_info "[DRY RUN] Would rollback deployment"
        return
    fi
    
    # Rollback main application
    rollback_ecs_service "$ECS_SERVICE_APP"
    
    # Rollback AI engine
    rollback_ecs_service "$ECS_SERVICE_AI"
    
    log_success "Rollback completed"
}

# Rollback specific ECS service
rollback_ecs_service() {
    local service_name="$1"
    
    log_info "Rolling back service: $service_name"
    
    # Get deployment history
    local deployments
    deployments=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER" \
        --services "$service_name" \
        --query 'services[0].deployments' \
        --output json)
    
    # Find previous stable deployment
    local previous_task_def
    previous_task_def=$(echo "$deployments" | jq -r '
        map(select(.status == "PRIMARY" and .rolloutState == "COMPLETED")) |
        sort_by(.createdAt) | reverse | .[1].taskDefinition
    ')
    
    if [[ "$previous_task_def" == "null" || -z "$previous_task_def" ]]; then
        log_error "No previous stable deployment found for $service_name"
        return 1
    fi
    
    log_info "Rolling back to task definition: $previous_task_def"
    
    # Update service with previous task definition
    aws ecs update-service \
        --cluster "$ECS_CLUSTER" \
        --service "$service_name" \
        --task-definition "$previous_task_def" > /dev/null
    
    # Wait for rollback to complete
    log_info "Waiting for rollback to complete..."
    aws ecs wait services-stable \
        --cluster "$ECS_CLUSTER" \
        --services "$service_name"
    
    log_success "Service $service_name rolled back successfully"
}

# Check deployment status
check_status() {
    log_info "Checking deployment status..."
    
    # Check main application service
    check_service_status "$ECS_SERVICE_APP"
    
    # Check AI engine service
    check_service_status "$ECS_SERVICE_AI"
}

# Check specific service status
check_service_status() {
    local service_name="$1"
    
    local service_info
    service_info=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER" \
        --services "$service_name" \
        --query 'services[0]' \
        --output json)
    
    local running_count desired_count deployment_status
    running_count=$(echo "$service_info" | jq -r '.runningCount')
    desired_count=$(echo "$service_info" | jq -r '.desiredCount')
    deployment_status=$(echo "$service_info" | jq -r '.deployments[0].rolloutState')
    
    echo "Service: $service_name"
    echo "  Running: $running_count/$desired_count"
    echo "  Status: $deployment_status"
    
    if [[ "$running_count" == "$desired_count" && "$deployment_status" == "COMPLETED" ]]; then
        log_success "$service_name is healthy"
    else
        log_warning "$service_name may have issues"
    fi
}

# View application logs
view_logs() {
    log_info "Fetching application logs..."
    
    # Get log group names
    local app_log_group="/ecs/hp-analysis-${ENVIRONMENT}-app"
    local ai_log_group="/ecs/hp-analysis-${ENVIRONMENT}-ai-engine"
    
    echo "Recent logs for main application:"
    aws logs tail "$app_log_group" --since 10m || log_warning "Could not fetch app logs"
    
    echo -e "\nRecent logs for AI engine:"
    aws logs tail "$ai_log_group" --since 10m || log_warning "Could not fetch AI engine logs"
}

# Validate deployment configuration
validate_deployment() {
    log_info "Validating deployment configuration..."
    
    # Check if ECR repositories exist
    local repos=("hp-analysis-${ENVIRONMENT}-app" "hp-analysis-${ENVIRONMENT}-ai-engine")
    for repo in "${repos[@]}"; do
        if ! aws ecr describe-repositories --repository-names "$repo" &> /dev/null; then
            log_error "ECR repository $repo does not exist"
            exit 1
        fi
    done
    
    # Check if ECS cluster exists
    if ! aws ecs describe-clusters --clusters "$ECS_CLUSTER" &> /dev/null; then
        log_error "ECS cluster $ECS_CLUSTER does not exist"
        exit 1
    fi
    
    # Check if ECS services exist
    local services=("$ECS_SERVICE_APP" "$ECS_SERVICE_AI")
    for service in "${services[@]}"; do
        if ! aws ecs describe-services --cluster "$ECS_CLUSTER" --services "$service" &> /dev/null; then
            log_error "ECS service $service does not exist"
            exit 1
        fi
    done
    
    log_success "Deployment configuration validated"
}

# Main execution
main() {
    parse_args "$@"
    validate_prerequisites
    set_environment_variables
    
    case $COMMAND in
        build)
            build_images
            ;;
        push)
            push_images
            ;;
        deploy)
            validate_deployment
            build_images
            push_images
            deploy_to_ecs
            ;;
        rollback)
            rollback_deployment
            ;;
        status)
            check_status
            ;;
        logs)
            view_logs
            ;;
        validate)
            validate_deployment
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            usage
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"