/* inspirationalQuotes: Shared daily-rotating inspirational quotes for the app */

export interface InspirationalQuote {
  /** Quote text without surrounding quotation marks */
  text: string
  /** Optional attribution shown below the quote */
  author?: string
}

/** All inspirational quotes; index order defines rotation sequence */
export const INSPIRATIONAL_QUOTES: InspirationalQuote[] = [
  { text: 'Nature does not hurry, yet everything is accomplished.', author: 'Lao Tzu' },
  { text: 'The journey of a thousand miles begins with one step.', author: 'Lao Tzu' },
  { text: 'Knowing others is intelligence; knowing yourself is true wisdom.', author: 'Lao Tzu' },
  { text: 'He who conquers himself is the mightiest warrior.', author: 'Confucius' },
  { text: 'The man who moves a mountain begins by carrying away small stones.', author: 'Confucius' },
  { text: 'Our greatest glory is not in never falling, but in rising every time we fall.', author: 'Confucius' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'When we are no longer able to change a situation, we are challenged to change ourselves.', author: 'Viktor Frankl' },
  { text: 'Between stimulus and response there is a space.', author: 'Viktor Frankl' },
  { text: 'What man actually needs is not a tensionless state but rather the striving for a worthwhile goal.', author: 'Viktor Frankl' },
  { text: 'The impediment to action advances action. What stands in the way becomes the way.', author: 'Marcus Aurelius' },
  { text: 'Waste no more time arguing what a good man should be. Be one.', author: 'Marcus Aurelius' },
  { text: 'You have power over your mind—not outside events.', author: 'Marcus Aurelius' },
  { text: 'Very little is needed to make a happy life.', author: 'Marcus Aurelius' },
  { text: 'The happiness of your life depends upon the quality of your thoughts.', author: 'Marcus Aurelius' },
  { text: 'We suffer more often in imagination than in reality.', author: 'Seneca' },
  { text: 'Luck is what happens when preparation meets opportunity.', author: 'Seneca' },
  { text: 'Difficulties strengthen the mind, as labor does the body.', author: 'Seneca' },
  { text: 'Begin at once to live.', author: 'Seneca' },
  { text: "Every new beginning comes from some other beginning's end.", author: 'Seneca' },
  { text: 'No man is free who is not master of himself.', author: 'Epictetus' },
  { text: "It's not what happens to you, but how you react to it that matters.", author: 'Epictetus' },
  { text: 'First say to yourself what you would be; and then do what you have to do.', author: 'Epictetus' },
  { text: 'We cannot choose our external circumstances, but we can always choose how we respond.', author: 'Epictetus' },
  { text: 'Freedom is the only worthy goal in life.', author: 'Epictetus' },
  { text: 'Knowing yourself is the beginning of all wisdom.', author: 'Aristotle' },
  { text: 'Quality is not an act, it is a habit.', author: 'Aristotle' },
  { text: 'Patience is bitter, but its fruit is sweet.', author: 'Aristotle' },
  { text: 'The roots of education are bitter, but the fruit is sweet.', author: 'Aristotle' },
  { text: 'Pleasure in the job puts perfection in the work.', author: 'Aristotle' },
  { text: 'Be kind, for everyone you meet is fighting a hard battle.', author: 'Plato' },
  { text: 'The first and best victory is to conquer self.', author: 'Plato' },
  { text: 'Thinking is the talking of the soul with itself.', author: 'Plato' },
  { text: 'Wise men speak because they have something to say.', author: 'Plato' },
  { text: 'Courage is knowing what not to fear.', author: 'Plato' },
  { text: 'The unexamined life is not worth living.', author: 'Socrates' },
  { text: 'Wonder is the beginning of wisdom.', author: 'Socrates' },
  { text: 'He is richest who is content with the least.', author: 'Socrates' },
  { text: 'To find yourself, think for yourself.', author: 'Socrates' },
  { text: 'Beware the barrenness of a busy life.', author: 'Socrates' },
  { text: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.', author: 'Ralph Waldo Emerson' },
  { text: 'Adopt the pace of nature: her secret is patience.', author: 'Ralph Waldo Emerson' },
  { text: 'Make the most of yourself, for that is all there is of you.', author: 'Ralph Waldo Emerson' },
  { text: 'Nothing can bring you peace but yourself.', author: 'Ralph Waldo Emerson' },
  { text: 'Do not go where the path may lead; go instead where there is no path and leave a trail.', author: 'Ralph Waldo Emerson' },
  { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  { text: 'Small deeds done are better than great deeds planned.', author: 'Peter Marshall' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Continuous improvement is better than delayed perfection.', author: 'Mark Twain' },
  { text: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
  { text: 'Well done is better than well said.', author: 'Benjamin Franklin' },
  { text: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
  { text: 'Energy and persistence conquer all things.', author: 'Benjamin Franklin' },
  { text: 'By failing to prepare, you are preparing to fail.', author: 'Benjamin Franklin' },
  { text: 'Diligence is the mother of good luck.', author: 'Benjamin Franklin' },
  { text: 'The best way out is always through.', author: 'Robert Frost' },
  { text: "In three words I can sum up everything I've learned about life: it goes on.", author: 'Robert Frost' },
  { text: 'Freedom lies in being bold.', author: 'Robert Frost' },
  { text: 'The only way around is through.', author: 'Robert Frost' },
  { text: 'Happiness makes up in height for what it lacks in length.', author: 'Robert Frost' },
  { text: 'Do the thing and you will have the power.', author: 'Ralph Waldo Emerson' },
  { text: 'A year from now you may wish you had started today.', author: 'Karen Lamb' },
  { text: 'What you do every day matters more than what you do once in a while.', author: 'Gretchen Rubin' },
  { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
  { text: 'The future depends on what you do today.', author: 'Mahatma Gandhi' },
  { text: 'Live as if you were to die tomorrow. Learn as if you were to live forever.', author: 'Mahatma Gandhi' },
  { text: 'Strength does not come from physical capacity. It comes from an indomitable will.', author: 'Mahatma Gandhi' },
  { text: 'The weak can never forgive. Forgiveness is the attribute of the strong.', author: 'Mahatma Gandhi' },
  { text: 'You must be the change you wish to see in the world.', author: 'Mahatma Gandhi' },
  { text: 'Satisfaction lies in the effort, not in the attainment.', author: 'Mahatma Gandhi' },
  { text: 'Do not pray for an easy life; pray for the strength to endure a difficult one.', author: 'Bruce Lee' },
  { text: 'Be water, my friend.', author: 'Bruce Lee' },
  { text: 'Knowing is not enough, we must apply.', author: 'Johann Wolfgang von Goethe' },
  { text: 'Everything should be made as simple as possible, but not simpler.', author: 'Albert Einstein' },
  { text: 'Life is like riding a bicycle. To keep your balance, you must keep moving.', author: 'Albert Einstein' },
  { text: 'Try not to become a man of success, but rather a man of value.', author: 'Albert Einstein' },
  { text: 'The important thing is not to stop questioning.', author: 'Albert Einstein' },
  { text: 'Out of clutter, find simplicity.', author: 'Albert Einstein' },
  { text: 'The quieter you become, the more you can hear.', author: 'Ram Dass' },
  { text: 'Be here now.', author: 'Ram Dass' },
  { text: 'The obstacle is the path.' },
  { text: 'Fall seven times, stand up eight.' },
  { text: 'A gem cannot be polished without friction.' },
  { text: 'The best time to plant a tree was twenty years ago. The second best time is now.' },
  { text: 'Patience is power.' },
  { text: 'Slow is smooth, smooth is fast.' },
  { text: 'Comparison is the thief of joy.', author: 'Theodore Roosevelt' },
  { text: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
  { text: "Believe you can and you're halfway there.", author: 'Theodore Roosevelt' },
  { text: 'Nothing worth having comes easy.' },
  { text: 'The two most important days in your life are the day you are born and the day you find out why.', author: 'Mark Twain' },
  { text: 'Courage is resistance to fear, mastery of fear—not absence of fear.', author: 'Mark Twain' },
  { text: 'The secret of your future is hidden in your daily routine.', author: 'Mike Murdock' },
  { text: 'Wherever you are, be all there.', author: 'Jim Elliot' },
  { text: 'The meaning of life is to find your gift. The purpose of life is to give it away.' },
  { text: 'A calm mind brings inner strength and self-confidence.', author: 'Dalai Lama' },
  { text: 'Happiness is not something ready made. It comes from your own actions.', author: 'Dalai Lama' },
  { text: 'Judge each day not by the harvest you reap but by the seeds you plant.', author: 'Robert Louis Stevenson' },
  { text: 'The oak fought the wind and was broken; the willow bent when it must and survived.', author: 'Robert Jordan' },
  { text: 'How we spend our days is, of course, how we spend our lives.', author: 'Annie Dillard' },
]

/**
 * Serial day number for a local calendar date (midnight-to-midnight in the user's timezone).
 * Used so the same quote appears all day and advances at local midnight.
 */
export function getLocalCalendarDaySerial(date: Date = new Date()): number {
  const y = date.getFullYear()
  const m = date.getMonth()
  const d = date.getDate()
  return Math.floor(Date.UTC(y, m, d) / 86_400_000)
}

/** Index into {@link INSPIRATIONAL_QUOTES} for the given local calendar day */
export function getDailyQuoteIndex(date: Date = new Date()): number {
  const count = INSPIRATIONAL_QUOTES.length
  const serial = getLocalCalendarDaySerial(date)
  return ((serial % count) + count) % count
}

/** Inspirational quote for the given local calendar day (cycles through all quotes) */
export function getDailyQuote(date: Date = new Date()): InspirationalQuote {
  return INSPIRATIONAL_QUOTES[getDailyQuoteIndex(date)]
}
