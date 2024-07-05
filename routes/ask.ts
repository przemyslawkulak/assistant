import { Request, Response, Router } from 'express';
import { findMeal, findMealCondition, taskFinder } from '../prompt';
import { callLlm } from '../llm';
import { addingShoppingListFlow } from './grocy';
import { Tasks } from '../enums';
import { v4 } from 'uuid';
import { currentConversation } from '../conversation';
import mealsGetPrisma from '../utils/db/meals/getMeals';
import { Meal } from '../utils/interfaces/meal';

const router = Router();

router.post('/', async (request: Request, response: Response) => {
  try {
    const { message } = request.body;
    console.log(message);
    const conversationId = (request.headers['x-conversation-id'] as string) || v4();
    console.log(conversationId);
    const conversation = await currentConversation(conversationId);
    response.set('x-conversation-id', conversationId);

    const answer = await callLlm(
      message,
      conversation,
      { response_format: { type: 'json_object' } },
      taskFinder,
      conversationId
    );
    console.log(answer);

    const parsedAnswer = JSON.parse(answer);
    const taskNumber = +parsedAnswer?.taskNumber;
    if (taskNumber === Tasks.ShoppingList) {
      const { data, parsedfoundProducts } = await addingShoppingListFlow(message, conversationId);

      return response
        .status(200)
        .json({ answer: parsedAnswer?.taskDescription, grocyResponse: data, foundProducts: parsedfoundProducts });
    } else if (taskNumber === Tasks.CreatingDinnerSchedules) {
      const mealCondtition = await callLlm(
        findMealCondition(message),
        conversation,
        { response_format: { type: 'json_object' } },
        undefined,
        conversationId
      );

      const parsedAnswer = JSON.parse(mealCondtition);

      let results = '';
      const grocyResponse = [];
      const foundProducts = [];

      for (const query of parsedAnswer.answer) {
        try {
          const mealList = (await mealsGetPrisma(query)) as Meal[];

          const oneMeal = findMeal(mealList);

          const answer = await callLlm(
            oneMeal,
            conversation,
            { response_format: { type: 'json_object' } },
            undefined,
            conversationId
          );

          const { mealName, ingredients } = JSON.parse(answer);

          const { data, parsedfoundProducts } = await addingShoppingListFlow(ingredients, conversationId, mealName);

          results += `* ${mealName}, <br>`;
          grocyResponse.push(data);
          foundProducts.push(parsedfoundProducts);
        } catch (error) {
          console.error('Error processing one of the queries:', error);
        }
      }

      return response.status(200).json({
        answer: results,
        type: parsedAnswer.taskDescription,
        grocyResponse,
        foundProducts,
      });
    } else if (taskNumber === Tasks.SearchingInternet || taskNumber === Tasks.None) {
      const searchResult = await callLlm(message, conversation, {}, undefined, conversationId);
      return response.status(200).json({
        answer: searchResult,
      });
    }

    return response.status(200).json({ answer: parsedAnswer?.taskDescription });
  } catch (err) {
    console.log(err);
    return response.json({
      status: 'error',
      data: `${request?.body?.type?.toUpperCase() || 'Unknown response'} could not be saved.`,
    });
  }
});

export default router;
