const db = require('./db');

async function testPaperRequests() {
  try {
    console.log('Testing paper requests CRUD functions...');

    // Test createPaperRequest
    const testRequest = {
      studentId: 1, // Assuming user with id 1 exists
      studentName: 'Test Student',
      subject: 'Mathematics',
      title: 'Test Paper Request',
      description: 'This is a test request',
      year: '2023',
      level: 'level1',
      status: 'pending'
    };

    const requestId = await db.createPaperRequest(testRequest);
    console.log('Created paper request with ID:', requestId);

    // Test getAllPaperRequests
    const allRequests = await db.getAllPaperRequests();
    console.log('All paper requests:', allRequests.length, 'found');

    // Test getPaperRequestById
    const request = await db.getPaperRequestById(requestId);
    console.log('Retrieved request:', request ? request.title : 'Not found');

    // Test getPaperRequestsByStudentId
    const studentRequests = await db.getPaperRequestsByStudentId(1);
    console.log('Requests by student ID 1:', studentRequests.length, 'found');

    // Test getPendingPaperRequests
    const pendingRequests = await db.getPendingPaperRequests();
    console.log('Pending requests:', pendingRequests.length, 'found');

    // Test updatePaperRequest
    await db.updatePaperRequest(requestId, { status: 'approved' });
    const updatedRequest = await db.getPaperRequestById(requestId);
    console.log('Updated request status:', updatedRequest.status);

    // Test deletePaperRequest
    await db.deletePaperRequest(requestId);
    const deletedRequest = await db.getPaperRequestById(requestId);
    console.log('Deleted request:', deletedRequest ? 'Still exists' : 'Successfully deleted');

    console.log('All tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit();
  }
}

testPaperRequests();
