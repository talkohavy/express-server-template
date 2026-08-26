import { ordersDataset, productsDataset, usersDataset } from '../datasets';
import type { DatasetDefinition } from '../../types';

export const DEFAULT_DATASETS: DatasetDefinition[] = [usersDataset, productsDataset, ordersDataset];
