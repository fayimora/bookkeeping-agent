import { categoryTools } from './categories/tools.ts';
import { expenseTools } from './expenses/tools.ts';

export function bookkeeperTools(userId: string) {
	return [...categoryTools(userId), ...expenseTools(userId)];
}
