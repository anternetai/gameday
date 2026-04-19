export const PROMPTS: string[] = [
  "Name one belief you hold about your business that most peers would disagree with. Why do you still hold it?",
  "What's something you learned this year that no book, podcast, or tweet taught you?",
  "If you had to ship one piece of content today that only you could make, what would it be?",
  "Take the hardest thing from last week and rewrite it as a strength. Not a silver lining — a real strength.",
  "What's the most interesting thing you said out loud to someone this week? Why did they react the way they did?",
  "Where are you following the advice of someone whose life you wouldn't actually want?",
  "Describe exactly what went wrong on your last failed attempt. No narrative. Just the facts in order.",
  "What's a tiny habit you've kept for 90+ days? What did it quietly turn into?",
  "A stranger walks up. You have 60 seconds to explain what you're really building and why. Write it.",
  "List 3 things you've said to different people this week that were secretly the same idea. What is that idea?",
  "What's true in your industry that people are afraid to say out loud?",
  "If you kept doing exactly what you did today every day for a year, where would you be? Is that what you want?",
  "What's a rule you've been following that you never consciously chose?",
  "Who are you pretending not to be? What would happen if you stopped pretending?",
  "What's the smallest version of the thing you're trying to build? Describe it in one paragraph.",
  "What's something you're secretly great at that you've never put on the internet?",
  "Pick a number you track. Why do you track it? What behavior does it actually create in you?",
  "What have you been doing out of habit that was once a deliberate choice? Is that choice still right?",
  "Name three people you talk to regularly. How is each one making you better — or worse? Specifically.",
  "Describe your work today to someone from five years ago. What do they find interesting? What do they find boring?",
  "What's the easiest thing you know that you haven't written down yet?",
  "If this project never worked, what would you have gained from it anyway? Be specific.",
  "What's a question a customer or prospect asked you this week that you couldn't fully answer?",
  "What's one decision you keep delaying? What's the cost of a wrong decision vs. no decision?",
  "Pick a tool, tactic, or idea you've defended for 12+ months. Steelman the case against it.",
  "What do you believe about money that your 22-year-old self would have called naive or greedy?",
  "What did today make you curious about that you didn't act on? Why not?",
  "What's the best piece of advice you've ever ignored on purpose? Were you right to?",
  "Describe a moment you felt most alive in the last 30 days. What was present? What was absent?",
  "If you had to stop one thing in your life cold turkey for a year, what would change the most?",
  "What's something that used to scare you that you now find boring? What scares you now — and will it look boring in two years?",
  "You're writing a letter to yourself 90 days from now. What do you want them to remember about today?",
  "What's the last thing you said 'yes' to out of guilt, fear, or momentum rather than conviction?",
  "What's the single most important piece of feedback you've received this year? What did you actually do with it?",
  "If someone secretly watched you work for a week, what would they learn about your real priorities?",
]

function hashDate(date: string): number {
  let h = 2166136261
  for (let i = 0; i < date.length; i++) {
    h ^= date.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h >>> 0
}

export function getPromptForDate(date: string): string {
  const idx = hashDate(date) % PROMPTS.length
  return PROMPTS[idx]
}

export function getShufflePrompt(currentText: string): string {
  if (PROMPTS.length === 0) return ""
  let pick = PROMPTS[Math.floor(Math.random() * PROMPTS.length)]
  for (let attempt = 0; attempt < 5 && pick === currentText; attempt++) {
    pick = PROMPTS[Math.floor(Math.random() * PROMPTS.length)]
  }
  return pick
}
