import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the credentials from the request
    const body = await request.json();
    const { email, password } = body;

    // Basic validation
    if (!email || !password) {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // In a real application, you would validate against a database
    // For now, we'll simulate a successful login for any valid email/password combination
    
    // Mock user object
    const user = {
      id: Math.random().toString(36).substring(2, 15),
      email,
      created_at: new Date().toISOString(),
    };

    // Generate a mock token
    const token = `mock_token_${Math.random().toString(36).substring(2, 15)}`;

    // Return success response
    return Response.json({
      user,
      token,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}