// หน้า http://localhost:3000/products
import ProductList from "@/components/ProductList";

export default function ProductsPage() {
  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">สินค้าทั้งหมด</h1>
      <ProductList />
    </main>
  );
}
