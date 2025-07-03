export async function POST(request) {
  try {
    const { text } = await request.json();
    
    if (!text || text.trim() === '') {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    // Get API endpoint from environment variables
    const apiEndpoint = process.env.PREDICT_API_URL || 'https://arkar1431-language-detector.hf.space/predict';

    // Call the external language detector API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text.trim() })
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const predictions = await response.json();
    
    // Return the predictions from the external API
    return Response.json(predictions);
    
  } catch (error) {
    console.error('Error calling language detector API:', error);
    return Response.json(
      { error: 'Failed to get predictions from model' }, 
      { status: 500 }
    );
  }
}
