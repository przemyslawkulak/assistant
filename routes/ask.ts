import { Request, Response, Router } from 'express';
import { taskFinder } from '../prompt';
import { callLlm } from '../llm';
import { addingShoppingListFlow } from './grocy';

const router = Router();

router.post('/', async (request: Request, response: Response) => {
  try {
    const { message } = request.body;
    console.log(message);
    const answer = await callLlm(message, { response_format: { type: 'json_object' } }, taskFinder);
    console.log(answer);

    const parsedAnswer = JSON.parse(answer);
    if (parsedAnswer?.taskNumber === '0') {
      const { data, parsedfoundProducts } = await addingShoppingListFlow(message);

      return response
        .status(200)
        .json({ answer: parsedAnswer?.taskDescription, grocyResponse: data, foundProducts: parsedfoundProducts });
    }

    if (parsedAnswer?.taskNumber === '5' || parsedAnswer?.taskNumber === '6') {
      const answer = await callLlm(message, {});

      const { data, parsedfoundProducts } = await addingShoppingListFlow(answer);

      return response.status(200).json({
        answer: answer,
        type: parsedAnswer.taskDescription,
        grocyResponse: data,
        foundProducts: parsedfoundProducts,
      });
    }

    return response.status(200).json({ answer: parsedAnswer?.taskDescription });
  } catch (err) {
    return response.json({
      status: 'error',
      data: `${request?.body?.type?.toUpperCase() || 'Unknown response'} could not be saved.`,
    });
  }
});

export default router;
