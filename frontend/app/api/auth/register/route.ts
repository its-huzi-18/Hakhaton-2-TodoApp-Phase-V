import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the user data from the request
    const body = await request.json();
    const { email, password } = body;

    // Basic validation
    if (!email || !password) {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // In a real application, you would connect to a database here
    // For now, we'll simulate a successful registration
    
    // Generate a mock user object
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
      message: 'Registration successful'
    });
  } catch (error) {
    console.error('Registration error:', error);
    return Response.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}