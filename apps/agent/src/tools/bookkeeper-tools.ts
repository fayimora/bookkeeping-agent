import { categoryTools } from './categories/tools';
import { expenseTools } from './expenses/tools';

export function bookkeeperTools(userId: string) {
	return [...categoryTools(userId), ...expenseTools(userId)];
}
