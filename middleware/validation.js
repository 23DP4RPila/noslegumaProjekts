const validator = require('validator');

function validateRegistration({ username, email, password }) {
  const errors = [];
  if (!username || typeof username !== 'string') errors.push('Lietotājvārds ir obligāts');
  else if (!/^[a-zA-Z0-9_\-\.]{3,30}$/.test(username))
    errors.push('Lietotājvārdam jābūt 3–30 rakstzīmes (burti, cipari, _ - .)');

  if (!email || typeof email !== 'string') errors.push('E-pasts ir obligāts');
  else if (!validator.isEmail(email)) errors.push('Nederīgs e-pasta formāts');

  if (!password || typeof password !== 'string') errors.push('Parole ir obligāta');
  else if (password.length < 8) errors.push('Parolei jābūt vismaz 8 rakstzīmes garai');
  else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password))
    errors.push('Parolei jāsatur lielie burti, mazie burti un cipari');

  return errors;
}

function validateLogin({ email, password }) {
  const errors = [];
  if (!email || !validator.isEmail(email)) errors.push('Nederīgs e-pasts');
  if (!password) errors.push('Parole ir obligāta');
  return errors;
}

function validateTask({ title, description, deadline, type }) {
  const errors = [];
  if (!title || typeof title !== 'string' || title.trim().length === 0)
    errors.push('Uzdevuma virsraksts ir obligāts');
  else if (title.length > 200) errors.push('Virsraksts ir pārāk garš (maks. 200 rakstzīmes)');
  if (description && typeof description === 'string' && description.length > 2000)
    errors.push('Apraksts ir pārāk garš (maks. 2000 rakstzīmes)');
  if (deadline && !validator.isISO8601(String(deadline)))
    errors.push('Nederīgs termiņa formāts (gaidīts ISO 8601)');
  if (type && !['regular', 'smart'].includes(type))
    errors.push('Nederīgs uzdevuma veids');
  return errors;
}

function sanitiseText(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;')).trim();
}

module.exports = { validateRegistration, validateLogin, validateTask, sanitiseText };
