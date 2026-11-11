// Input sanitization utilities

export function sanitizeInput(input: string): string {
  return input.replace(/[<>"'&]/g, (char) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '&': '&amp;',
    };
    return entities[char] ?? char;
  });
}

export function sanitizeStationCode(code: string): string {
  // Station codes are uppercase alphanumeric, max 5 chars
  return code.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 5);
}

export function sanitizeTrainNumber(num: string): string {
  return num.replace(/[^0-9]/g, '').slice(0, 5);
}

export function sanitizeName(name: string): string {
  // Only uppercase letters and spaces, max 16 chars
  return name.replace(/[^A-Za-z\s]/g, '').toUpperCase().slice(0, 16);
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '').slice(0, 10);
}
