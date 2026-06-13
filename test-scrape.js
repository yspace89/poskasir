import axios from 'axios';

async function testScrape() {
  try {
    const response = await axios.get('https://world.openfoodfacts.org/cgi/search.pl?search_terms=chitato&search_simple=1&action=process&json=1');
    const products = response.data.products;
    if (products && products.length > 0) {
        console.log("Found Image URL:", products[0].image_url);
    } else {
        console.log("Not found.");
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testScrape();
