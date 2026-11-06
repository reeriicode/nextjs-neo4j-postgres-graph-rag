// ตารางของระบบขายของ (ข้อมูลปกติ ไม่เกี่ยวกับ RAG)
//
// หมายเหตุ TypeORM + Next.js:
// - ระบุ type ของทุก column เอง จะได้ไม่ต้องพึ่ง emitDecoratorMetadata
// - ใช้ Relation<T> ครอบ type ของ relation เพื่อกันปัญหา circular import
import "reflect-metadata";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from "typeorm";

@Entity("categories")
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 100, unique: true })
  name: string;

  @OneToMany(() => Product, (p) => p.category)
  products?: Relation<Product[]>;
}

@Entity("products")
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 200 })
  name: string;

  // ข้อความอิสระ: LLM จะอ่านส่วนนี้เพื่อดึง "คุณสมบัติ" ออกมาเป็น node ในกราฟ
  @Column({ type: "text", default: "" })
  description: string;

  @Column({ type: "numeric", precision: 10, scale: 2, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  price: number;

  @Column({ type: "int", default: 0 })
  stock: number;

  @Column({ type: "int", name: "category_id" })
  categoryId: number;

  @ManyToOne(() => Category, (c) => c.products, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "category_id" })
  category?: Relation<Category>;
}

@Entity("customers")
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 200 })
  name: string;

  @Column({ type: "varchar", length: 100 })
  province: string;
}

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int", name: "customer_id" })
  customerId: number;

  @ManyToOne(() => Customer, { onDelete: "CASCADE" })
  @JoinColumn({ name: "customer_id" })
  customer?: Relation<Customer>;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  total: number;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt: Date;

  @OneToMany(() => OrderItem, (i) => i.order, { cascade: true })
  items?: Relation<OrderItem[]>;
}

@Entity("order_items")
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int", name: "order_id" })
  orderId: number;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order?: Relation<Order>;

  @Column({ type: "int", name: "product_id" })
  productId: number;

  @ManyToOne(() => Product, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "product_id" })
  product?: Relation<Product>;

  @Column({ type: "int" })
  quantity: number;

  // ราคาต่อชิ้น ณ ตอนซื้อ
  @Column({ type: "numeric", precision: 10, scale: 2, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  price: number;
}

@Entity("reviews")
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int", name: "product_id" })
  productId: number;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product?: Relation<Product>;

  @Column({ type: "int", name: "customer_id" })
  customerId: number;

  @ManyToOne(() => Customer, { onDelete: "CASCADE" })
  @JoinColumn({ name: "customer_id" })
  customer?: Relation<Customer>;

  @Column({ type: "int" })
  rating: number; // 1-5

  // ข้อความรีวิว: LLM จะอ่านเพื่อหาว่าลูกค้า "ชม" หรือ "ติ" เรื่องอะไร
  @Column({ type: "text" })
  comment: string;
}
