
export const submitToWebhook = async (bookingDetails: any) => {
  try {
    const response = await fetch('https://hkdk.events/wz3060p3xycrzi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingDetails)
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit to webhook');
    }
    
    return true;
  } catch (error) {
    console.error('Webhook submission error:', error);
    throw error;
  }
};
