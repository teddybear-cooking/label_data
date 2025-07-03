import crypto from 'crypto';

const VALID_CODE = '147316';
const VALID_PASSWORD = 'Alphapeka31';

export async function POST(request) {
  try {
    const { code, password } = await request.json();

    // Validate credentials
    if (code !== VALID_CODE || password !== VALID_PASSWORD) {
      return Response.json({ 
        error: 'Invalid credentials' 
      }, { status: 401 });
    }

    // Generate a simple token (timestamp + random string)
    const token = crypto.randomBytes(32).toString('hex') + '_' + Date.now();

    return Response.json({ 
      success: true, 
      token,
      message: 'Login successful' 
    });

  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ 
      error: 'Login failed' 
    }, { status: 500 });
  }
} 