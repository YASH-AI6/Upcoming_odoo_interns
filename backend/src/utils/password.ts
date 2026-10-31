import bcrypt from "bcryptjs";

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{9,}$/;

export const validatePasswordComplexity = (password: string): boolean => {
  return PASSWORD_REGEX.test(password);
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
