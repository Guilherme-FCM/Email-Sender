#!/bin/sh

echo "Waiting for LocalStack to be ready..."
until curl -sf http://localstack:4566/_localstack/health | grep -q '"sqs": "available"'; do
  sleep 2
done

echo "Creating SQS queues..."

aws --endpoint-url=http://localstack:4566 sqs create-queue \
  --queue-name emails-dlq \
  --region us-east-1

aws --endpoint-url=http://localstack:4566 sqs create-queue \
  --queue-name emails-queue \
  --attributes '{"RedrivePolicy":"{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:000000000000:emails-dlq\",\"maxReceiveCount\":\"3\"}"}' \
  --region us-east-1

echo "SQS queues created successfully."
