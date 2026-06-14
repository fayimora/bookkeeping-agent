import { Input } from '@bookeeping-agent/ui/components/input';
import { Label } from '@bookeeping-agent/ui/components/label';

import type { CategoryFormValues } from './types';
import { slugifyCategoryName } from './utils';

export function CategoryForm({
	isEditing,
	onChange,
	values,
}: {
	isEditing: boolean;
	onChange: (values: CategoryFormValues) => void;
	values: CategoryFormValues;
}) {
	const updateName = (name: string) => {
		onChange({
			...values,
			name,
			slug: isEditing ? values.slug : slugifyCategoryName(name),
		});
	};

	return (
		<div className="grid gap-4">
			<div className="grid gap-2">
				<Label htmlFor="category-name">Name</Label>
				<Input
					autoFocus
					id="category-name"
					onChange={(event) => updateName(event.target.value)}
					placeholder="Food"
					required
					value={values.name}
				/>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="category-slug">Slug</Label>
				<Input
					id="category-slug"
					onChange={(event) =>
						onChange({
							...values,
							slug: slugifyCategoryName(event.target.value),
						})
					}
					placeholder="food"
					required
					value={values.slug}
				/>
			</div>
		</div>
	);
}
