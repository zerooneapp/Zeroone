const mongoose = require('mongoose');
const moment = require('moment-timezone');
const TIME_FORMATS = ['HH:mm', 'H:mm', 'hh:mm A', 'h:mm A'];

const buildMomentFromTime = (date, timeStr) => {
  if (!timeStr) return null;
  const parsed = moment.tz(timeStr.trim(), TIME_FORMATS, false, 'Asia/Kolkata');
  if (!parsed.isValid()) return null;
  return date.clone()
    .hour(parsed.hour())
    .minute(parsed.minute())
    .second(0)
    .millisecond(0);
};

const targetDate = moment('2026-06-05').tz('Asia/Kolkata').startOf('day');
const open = buildMomentFromTime(targetDate, '06:00 AM');
const close = buildMomentFromTime(targetDate, '12:00 AM');

console.log('Open:', open ? open.format('YYYY-MM-DD HH:mm') : 'invalid');
console.log('Close:', close ? close.format('YYYY-MM-DD HH:mm') : 'invalid');
console.log('Is Close after Open?', close.isAfter(open));
