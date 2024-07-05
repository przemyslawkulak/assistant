import { Request, Response, Router } from 'express';
import mealsCreatePrisma from '../utils/db/meals/createMeals';
import { Meal } from '../utils/interfaces/meal';
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
import mealGetPrisma from '../utils/db/meals/getMeal';
import mealUpdatePrisma from '../utils/db/meals/updateMeal';
import mealDeletePrisma from '../utils/db/meals/deleteMeal';
import { COLLECTION_NAME, createDocument, createQdrantCollection, qdrant, syncData } from '../utils/qdrant/collectionsUtils';
import dotenv from 'dotenv';
import { textToVector } from '../llm';

dotenv.config();

const router = Router();

const csvFilePath = path.join(__dirname, '..', 'static', 'meals.csv');

router.post('/', async (req, res) => {
  const meal: Meal = req.body;

  try {
    // Insert into PostgreSQL database
    const newMeal = (await mealsCreatePrisma(meal)) as Meal;

    const document = createDocument(newMeal);

    const vector = textToVector(document.pageContent);

    // Insert into Qdrant
    await qdrant.upsert(COLLECTION_NAME, [
      {
        id: newMeal.id,
        vector: vector,
        payload: { id: newMeal.id },
      },
    ]);

    res.status(201).json(newMeal);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get('/', async (req, res) => {
  await createQdrantCollection();
  const points = await syncData();
  res.status(200).json(points);
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const meal = await mealGetPrisma(+id);

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    res.json(meal);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const meal: Meal = req.body;

  try {
    // Update PostgreSQL database
    const updatedMeal = (await mealUpdatePrisma(+id, meal)) as Meal;

    const document = createDocument(updatedMeal);

    const vector = textToVector(document.pageContent);

    // Update Qdrant
    await qdrant.upsert(COLLECTION_NAME, [
      {
        id: updatedMeal.id,
        vector: vector,
        payload: { id: updatedMeal.id },
      },
    ]);

    res.json(updatedMeal);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.delete('//:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Delete from PostgreSQL database
    await mealDeletePrisma(+id);

    // Delete from Qdrant
    await qdrant.delete(COLLECTION_NAME, {
      ids: [parseInt(id, 10)],
    });

    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json(error);
  }
});

// Route to read CSV file
router.get('/read-csv', (req: Request, res: Response) => {
  const results: object[] = [];

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (data: object) => results.push(data))
    .on('end', () => {
      res.json(results);
    });
});



export default router;
