export const DEFAULT_SKILLS = [
  {
    name: "lambda-generator",
    description: "Generates production-ready AWS Lambda functions with Python 3.11 runtime, structured logging, monitoring instrumentation, input validation, and deployment configurations for API Gateway, SQS, EventBridge, or S3 triggers.",
    instructions: `# Lambda Generator Skill

## Overview
Generate production-ready AWS Lambda functions following platform architecture standards.

## Requirements
- Runtime: Python 3.11
- Structured project layout with handler, utils, models, and tests
- Logging wrapper usage with structured JSON logging
- Monitoring metric emission: request_count, error_count, latency
- Input schema validation using Pydantic
- Deployment configuration for triggers (API Gateway, SQS, EventBridge, S3)

## Project Structure
\`\`\`
lambda-function/
├── src/
│   ├── __init__.py
│   ├── handler.py          # Main Lambda handler
│   ├── models.py           # Pydantic models for validation
│   ├── utils.py            # Helper utilities
│   └── monitoring.py       # Metrics and logging
├── tests/
│   ├── __init__.py
│   └── test_handler.py     # Unit tests
├── infra/
│   └── main.tf             # Terraform deployment config
├── requirements.txt
└── README.md
\`\`\`

## Steps
1. Analyze the user's requirements for the Lambda function
2. Generate handler with proper error handling and logging
3. Create Pydantic models for input/output validation
4. Add monitoring instrumentation (CloudWatch metrics)
5. Generate Terraform deployment configuration
6. Create unit tests with pytest
7. Generate README with deployment instructions`,
    category: "serverless",
  },
  {
    name: "glue-job-generator",
    description: "Generates PySpark-based AWS Glue ETL pipelines that read raw data, apply transformations, write to unified platform tables, enforce partitioning, and include logging and monitoring.",
    instructions: `# Glue Job Generator Skill

## Overview
Generate AWS Glue ETL jobs using PySpark following data platform standards.

## Requirements
- PySpark-based ETL pipeline
- Read from raw data tables (S3/Glue Catalog)
- Apply transformations with data quality checks
- Write to unified platform tables with proper partitioning
- Structured logging with CloudWatch integration
- Job bookmarks for incremental processing

## Steps
1. Define source and target schemas
2. Generate PySpark transformation logic
3. Add data quality validation checks
4. Configure partitioning strategy (date-based, hash)
5. Add monitoring and alerting hooks
6. Generate Glue job configuration (JSON)
7. Create integration tests`,
    category: "data-engineering",
  },
  {
    name: "spark-pipeline-generator",
    description: "Generates scalable Apache Spark pipelines with schema definitions, partitioning strategies, validation layers, exception handling, and performance optimizations.",
    instructions: `# Spark Pipeline Generator Skill

## Overview
Generate production-grade Spark pipelines with proper schema management and optimization.

## Requirements
- Schema definitions using StructType
- Partitioning strategies for optimal read/write performance
- Data validation layers with custom rules
- Exception handling with dead-letter queues
- Performance optimizations (broadcast joins, caching, repartitioning)

## Steps
1. Define input/output schemas
2. Generate pipeline DAG with transformations
3. Add validation and quality checks
4. Configure partitioning and bucketing
5. Add error handling and DLQ logic
6. Generate performance tuning configurations
7. Create test harness with sample data`,
    category: "data-engineering",
  },
  {
    name: "schema-designer",
    description: "Generates standardized database schemas aligned with the unified data model including naming conventions, primary/foreign keys, metadata fields, and partition columns.",
    instructions: `# Schema Designer Skill

## Overview
Design database schemas following platform naming conventions and data model standards.

## Naming Conventions
- Tables: snake_case, plural (e.g., user_events, order_items)
- Columns: snake_case (e.g., created_at, user_id)
- Primary keys: \`id\` (UUID)
- Foreign keys: \`{table_singular}_id\`
- Timestamps: \`created_at\`, \`updated_at\`, \`deleted_at\`

## Required Metadata Fields
- id (UUID, primary key)
- created_at (timestamp with timezone)
- updated_at (timestamp with timezone)
- created_by (UUID, reference to users)
- version (integer, for optimistic locking)

## Steps
1. Analyze domain requirements
2. Design normalized schema (3NF minimum)
3. Add metadata and audit fields
4. Define indexes for query patterns
5. Add partition columns for large tables
6. Generate DDL statements
7. Create migration scripts`,
    category: "data-modeling",
  },
  {
    name: "schema-validator",
    description: "Validates existing schemas against platform standards, checking naming conventions, required metadata fields, relationships, and analytics model compatibility.",
    instructions: `# Schema Validator Skill

## Overview
Validate database schemas against platform architecture standards.

## Validation Rules
1. Naming convention compliance (snake_case)
2. Required metadata fields present (id, created_at, updated_at)
3. Foreign key relationships properly defined
4. Indexes exist for foreign keys
5. Partition columns defined for tables > 1M rows
6. No nullable primary keys
7. Proper data types (UUID for IDs, timestamptz for dates)

## Steps
1. Parse the provided schema
2. Run naming convention checks
3. Verify required metadata fields
4. Validate relationships and foreign keys
5. Check index coverage
6. Generate compliance report with pass/fail per rule
7. Suggest fixes for violations`,
    category: "data-modeling",
  },
  {
    name: "monitoring-instrumentation",
    description: "Automatically injects logging frameworks, metrics collection, distributed tracing, and alert integrations into services and pipelines for full observability.",
    instructions: `# Monitoring Instrumentation Skill

## Overview
Add comprehensive observability to any service or pipeline.

## Components
- **Logging**: Structured JSON logging with correlation IDs
- **Metrics**: CloudWatch/Datadog custom metrics
- **Tracing**: OpenTelemetry distributed tracing
- **Alerts**: PagerDuty/Slack alert definitions

## Standard Metrics
- request_count (counter)
- error_count (counter, by error_type)
- latency_ms (histogram)
- active_connections (gauge)

## Steps
1. Analyze the target service/pipeline
2. Add structured logging wrapper
3. Instrument key operations with metrics
4. Add distributed tracing spans
5. Define alert thresholds and escalation rules
6. Generate dashboard configuration (Grafana/Datadog JSON)
7. Create runbook template`,
    category: "observability",
  },
];
