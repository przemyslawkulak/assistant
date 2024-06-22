import { Request, Response, Router } from 'express';
import { identifyProducts } from '../prompt';
import { callLlm } from '../llm';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

router.get('/', async (request: Request, response: Response) => {
  try {
    const url1 = 'https://grocy.byst.re/api/objects/locations';
    const url2 = 'https://grocy.byst.re/api/objects/products';
    const settings = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'GROCY-API-KEY': process.env.GROCY_API_KEY || '',
      },
    };

    const [response1, response2] = await Promise.all([fetch(url1, settings), fetch(url2, settings)]);

    if (!response1.ok || !response2.ok) {
      throw new Error('Failed to fetch data from Grocy API');
    }

    const data1 = await response1.json();
    const data2 = await response2.json();

    response.status(200).json({
      locations: data1.map((loc: any) => ({ id: loc.id, name: loc.name })),
      products: data2.map((prod: any) => ({ id: prod.id, name: prod.name })),
    });
  } catch (err) {
    console.error(err);
    response.status(500).json({
      status: 'error',
      message: 'Could not retrieve data',
    });
  }
});

export async function addProductToShoppingList(product: any, createdProduct?: any) {
  try {
    const url = 'https://grocy.byst.re/api/stock/shoppinglist/add-product';
    const settings = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'GROCY-API-KEY': process.env.GROCY_API_KEY || '',
      },
      body: JSON.stringify({
        product_id: createdProduct?.created_object_id || product.productId,
        list_id: 1,
        product_amount: product.count,
      }),
    };

    const response = await fetch(url, settings);

    if (!response.ok) {
      throw new Error('Failed to add product to shopping list');
    }

    return response;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function addProduct(product: any): Promise<any> {
  try {
    const body = JSON.stringify({
      name: product.productName,
      location_id: product.categoryId,
      qu_id_purchase: '1',
      qu_id_stock: '1',
    });

    const url = 'https://grocy.byst.re/api/objects/products';
    const settings = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'GROCY-API-KEY': process.env.GROCY_API_KEY || '',
      },
      body,
    };

    const response = await fetch(url, settings);

    if (!response.ok) {
      throw new Error('Failed to add product');
    }

    return response;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function addingShoppingListFlow(message: string, conversationId: string) {
  try {
    const grocyResponse = await fetch('http://localhost:3000/api/grocy', {
      method: 'GET',
    });

    if (!grocyResponse.ok) {
      throw new Error('Failed to fetch data from local API');
    }

    const data = await grocyResponse.json();

    const messages = identifyProducts(message, data.products, data.locations);
    const foundProducts = await callLlm(messages, [], { response_format: { type: 'json_object' } }, '', conversationId);
    const parsedfoundProducts = JSON.parse(foundProducts);

    for (const element of parsedfoundProducts.products) {
      if (!element.productId) {
        const product = await addProduct(element);
        const firstData = await product.json();

        await addProductToShoppingList(element, firstData);
      } else {
        await addProductToShoppingList(element);
      }
    }
    return { data, parsedfoundProducts };
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export default router;
