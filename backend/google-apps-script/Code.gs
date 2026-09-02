/**
 * Code.gs
 * Main Web App Entry Point for Google Apps Script
 */

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  try {
    var rawPostData = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var body = {};
    try {
      body = JSON.parse(rawPostData);
    } catch (err) {
      body = {};
    }

    // Merge query parameters if GET
    if (method === 'GET' && e && e.parameter) {
      body.action = e.parameter.action || body.action;
      body.token = e.parameter.token || body.token;
      body.requestId = e.parameter.requestId || body.requestId;
    }

    var requestId = body.requestId || ('REQ-' + Utilities.getUuid());

    // Check Idempotency for mutations
    if (method === 'POST' && body.action && body.action.indexOf('.get') === -1 && body.action.indexOf('.list') === -1) {
      var cachedResult = checkIdempotency(requestId);
      if (cachedResult) {
        return createJsonResponse(cachedResult);
      }
    }

    // Dispatch action
    var result = dispatchAction(body.action, body.payload || {}, body.token, requestId);
    
    var responseEnvelope = {
      success: true,
      data: result,
      message: 'Operation completed successfully',
      requestId: requestId,
      timestamp: new Date().toISOString()
    };

    if (method === 'POST') {
      recordIdempotency(requestId, responseEnvelope);
    }

    return createJsonResponse(responseEnvelope);

  } catch (error) {
    Logger.log('API Execution Error: ' + error.toString());
    var errorEnvelope = {
      success: false,
      data: null,
      message: error.message || 'An unexpected error occurred',
      errorCode: error.name || 'INTERNAL_ERROR',
      requestId: (body && body.requestId) ? body.requestId : 'REQ-ERR',
      timestamp: new Date().toISOString()
    };
    return createJsonResponse(errorEnvelope);
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
