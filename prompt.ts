export const taskFinder = `Based on the user message, judge whether the message is complex. Tasks to choose from:
0 shopping list - adding, removing items to shopping list, getting shopping lists, all actions connected with grocy application, adding/removing  new product to product list
1 to do list - managing tasks - adding, deleting, completing getting lis of tasks
2 management playlist - all playlist CRUD operation
3 budget management
4 calendar
5 creating dinner schedules - all about creating dishes list and finding new receipes
6 searching for information on the Internet.
Return only name of the task in Polish and number of the task in this JSON format eg. { "taskNumber": "0", "taskDescription": "lista zakupów"} and nothing else`;

export const identifyProducts = (message: string, products: string[], category: string[]) => {
  return `Jesteś asystentem który dorzuca produkty do listy zakupowej. Masz polecenie: ${message}. \n  Znajdź produkty z polecenia szukając ich formy pojedynczej na liście ${JSON.stringify(
    products
  )} oraz ich id. Jeśli nie ma prodktu na liście to ustaw id_produktu na 0 \n Dopasuj do której kategorii pasuje konkretny produkt z listy: ${JSON.stringify(
    category
  )}.\n ###Przykładowa odpowiedź w formacie JSON: Polecenie: Dodaj 3 gruszki, Odpowiedź: {"products": [{"productName":"gruszka", productId: 1, "count":3, "categoryName": "Owoc", "categoryId": 4 }]}, zwróć tylko objekt ze wszystkimi produktami i nic więcej`;
};
