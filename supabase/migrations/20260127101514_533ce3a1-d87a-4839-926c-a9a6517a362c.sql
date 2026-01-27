-- Allow users to see driver assignments for their orders (for tracking)
CREATE POLICY "Users can view driver assignments for own orders"
ON public.driver_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = driver_assignments.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Allow store owners to view driver assignments for their store orders
CREATE POLICY "Store owners can view driver assignments"
ON public.driver_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    JOIN stores ON stores.id = orders.store_id
    WHERE orders.id = driver_assignments.order_id 
    AND stores.owner_id = auth.uid()
  )
);

-- Allow store owners to create driver assignments for their orders
CREATE POLICY "Store owners can create driver assignments"
ON public.driver_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    JOIN stores ON stores.id = orders.store_id
    WHERE orders.id = driver_assignments.order_id 
    AND stores.owner_id = auth.uid()
  )
);