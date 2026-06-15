import { listCategories } from '@bookeeping-agent/db/queries/categories';
import { defineTool, type ToolDefinition } from '@flue/runtime';

import { listCategoriesParameters } from './schemas.ts';

const listCategoriesTool = defineTool({
	name: 'list_categories',
	description:
		'List the available expense categories. Use this before creating an expense when you need a valid category.',
	parameters: listCategoriesParameters,
	execute: async () => {
		const categories = await listCategories();
		return JSON.stringify({ categories });
	},
});

export const categoryTools: ToolDefinition[] = [listCategoriesTool];
