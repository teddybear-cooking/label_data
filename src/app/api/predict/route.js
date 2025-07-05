export async function POST(request) {
  let text = '';
  
  try {
    const requestBody = await request.json();
    text = requestBody.text;
    
    if (!text || text.trim() === '') {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    // Use the endpoint from environment variable
    const apiEndpoint = process.env.LANGUAGE_DETECTOR_API_ENDPOINT;

    console.log('Calling external API:', apiEndpoint);
    console.log('Request payload:', { text: text.trim() });

    // Call the external language detector API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ text: text.trim() }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('API Response status:', response.status);
    console.log('API Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`API responded with status: ${response.status} - ${errorText}`);
    }

    const predictions = await response.json();
    console.log('API Success Response:', predictions);
    
    // Return the predictions from the external API
    return Response.json(predictions);
    
  } catch (error) {
    console.error('Error calling language detector API:', error);
    
    // Return a fallback response with mock predictions for development
    if (error.name === 'AbortError') {
      console.log('API request timed out, returning fallback');
    } else {
      console.log('API request failed, returning fallback');
    }
    
    // Fallback mock response for development/testing
    return Response.json({
      text: text.trim() || 'sample text',
      predicted_category: "normal",
      confidence: 0.5,
      all_probabilities: {
        normal: 0.5,
        hate_speech: 0.2,
        offensive: 0.15,
        religious_hate: 0.1,
        political_hate: 0.05
      },
      sentence_count: 1,
      text_length: text.trim().length || 0,
      processing_time_ms: 100.0,
      fallback: true
    });
  }
}
