import { Request, Response, Router } from 'express';
import { identifyProducts } from '../prompt';
import { callLlm } from '../llm';

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

    const data1 = await response1.json();
    const data2 = await response2.json();

    response.json({
      locations: data1.map((loc: any) => ({ id: loc.id, name: loc.name })),
      products: data2.map((prod: any) => ({ id: prod.id, name: prod.name })),
    });
  } catch (err) {
    response.json({
      status: 'error',
      data: `${request?.body?.type?.toUpperCase() || 'Unknown information'} could not be saved.`,
    });
  }
});

export async function addProductToShoppingList(product: any, createdProduct?: any) {
  console.log('addProductToShoppingList', product, createdProduct, {
    product_id: createdProduct?.created_object_id || product.productId,
    list_id: 1,
    product_amount: product.count,
  });
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
  return await fetch(url, settings);
}

export async function addProduct(product: any): Promise<any> {
  const body = JSON.stringify({
    name: product.productName,
    location_id: product.categoryId,
    qu_id_purchase: '1',
    qu_id_stock: '1',
  });
  console.log('addProduct', body);

  const url = 'https://grocy.byst.re/api/objects/products';
  const settings = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'GROCY-API-KEY': process.env.GROCY_API_KEY || '',
    },
    body,
  };
  return await fetch(url, settings);
}

export async function addingShoppingListFlow(message: string) {
  const grocyResponse = await fetch('http://localhost:3000/api/grocy', {
    method: 'GET',
  });
  const data = await grocyResponse.json();

  const messages = identifyProducts(message, data.products, data.locations);
  const foundProducts = await callLlm(messages, { response_format: { type: 'json_object' } });
  const parsedfoundProducts = JSON.parse(foundProducts);
  console.log(parsedfoundProducts);
  parsedfoundProducts.products.forEach(
    async (element: {
      productName: string;
      productId: number;
      count: number;
      categoryName: string;
      categoryId: number;
    }) => {
      if (!element.productId) {
        const product = await addProduct(element);
        const firstData = await product.json();

        await addProductToShoppingList(element, firstData);
      } else {
        await addProductToShoppingList(element);
      }
    }
  );
  return { data, parsedfoundProducts };
}

export default router;
