const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/engines/text-davinci-002/completions';

async function solveMathProblem(problem) {
  try {
    const response = await axios.post(
      API_URL,
      {
        prompt: `Please provide a detailed solution, explanation, and example for the following math problem: ${problem}`,
        max_tokens: 200,
        n: 1,
        stop: null,
        temperature: 0.5,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return null;
  }
}

module.exports = { solveMathProblem };
