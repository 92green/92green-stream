# 1.0.0
## Breaking Changes
* queryAll no longer uses DynamoDBClient but instead uses DocumentClient preventing the need to marshall and unmarshall data
* batchWriteRetry no longer accepts feedbackPipe to mutate data before import (this is probably better implemented in place where required)
* The dynamodb and eventbus import paths have been removed in favour of exports from the entrypoint

## Fixes
* batchWriteRetry uses last to prevent it from emitting multiple times if there are unprocessed items
