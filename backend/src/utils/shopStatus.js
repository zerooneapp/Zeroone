const moment = require('moment-timezone');

/**
 * Calculates if a shop should be open based on working hours.
 * @param {Object} workingHours { start: string, end: string }
 * @returns {boolean}
 */
const isShopCurrentlyOpen = (workingHours) => {
  if (!workingHours || !workingHours.start || !workingHours.end) return true;

  const now = moment().tz('Asia/Kolkata');
  const currentTime = now.clone();

  // Parse start and end times
  const startTime = moment.tz(workingHours.start, ['h:mm A', 'hh:mm A', 'HH:mm'], 'Asia/Kolkata');
  const endTime = moment.tz(workingHours.end, ['h:mm A', 'hh:mm A', 'HH:mm'], 'Asia/Kolkata');

  if (!startTime.isValid() || !endTime.isValid()) return true;

  // Set the dates to today for comparison
  startTime.year(currentTime.year()).month(currentTime.month()).date(currentTime.date());
  endTime.year(currentTime.year()).month(currentTime.month()).date(currentTime.date());

  // Handle overnight shifts (e.g., 10:00 PM to 02:00 AM)
  if (endTime.isBefore(startTime)) {
    if (currentTime.isAfter(startTime)) {
      // It's currently after the start time today
      return true;
    } else if (currentTime.isBefore(endTime)) {
      // It's currently before the end time (meaning after midnight)
      return true;
    }
    return false;
  }

  // Normal daytime shift
  return currentTime.isBetween(startTime, endTime, null, '[]'); // [] means inclusive
};

module.exports = { isShopCurrentlyOpen };
