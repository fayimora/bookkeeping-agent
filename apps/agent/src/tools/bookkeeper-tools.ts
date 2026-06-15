import { categoryTools } from './categories/tools.ts';
import { expenseTools } from './expenses/tools.ts';

export const bookkeeperTools = [...categoryTools, ...expenseTools];
