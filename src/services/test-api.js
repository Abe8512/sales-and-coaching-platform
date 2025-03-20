// Test file to check OpenAI API connection
async function testOpenAIConnection() {
  const apiKey = localStorage.getItem("openai_api_key") || "test-key";
  console.log("Testing OpenAI API connection...");
  
  try {
    // Test a simple GET request to the OpenAI API
    const response = await fetch('/api/transcribe/test', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    console.log(`API test response status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(`API test response body: ${text.substring(0, 200)}`);
    
    return {
      status: response.status,
      text: text
    };
  } catch (error) {
    console.error("OpenAI API connection test failed:", error);
    return {
      error: error.message
    };
  }
}

// Export the test function
export { testOpenAIConnection }; 