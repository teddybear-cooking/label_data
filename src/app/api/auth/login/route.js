export async function POST(request) {
  try {
    const { code, password } = await request.json();
    
    // Check against environment variables or hardcoded values
    const validCode = process.env.ADMIN_CODE || 'admin123';
    const validPassword = process.env.ADMIN_PASSWORD || 'password123';
    
    if (code === validCode && password === validPassword) {
      // Generate a simple token (in production, use proper JWT)
      const token = btoa(`${code}:${password}:${Date.now()}`);
      
      return Response.json({
        success: true,
        token: token,
        message: 'Login successful'
      });
    }
    
    return Response.json({
      success: false,
      error: 'Invalid credentials'
    }, { status: 401 });
    
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({
      success: false,
      error: 'Login failed'
    }, { status: 500 });
  }
} 