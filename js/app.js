let products = [];
let cart = JSON.parse(localStorage.getItem("acaciaCart") || "[]");
let activeCategory = "all";

const categoryNames = {
  all:"الكل", Anesthesia:"التخدير", Endodontics:"علاج الجذور",
  Restorative:"الترميم", Impression:"الطبعات", Disposable:"مستلزمات الاستخدام الواحد",
  "Infection Control":"مكافحة العدوى", Instruments:"الأدوات", Equipment:"الأجهزة",
  Preventive:"الوقاية", Prosthodontics:"التعويضات", Whitening:"تبييض الأسنان",
  Orthodontics:"تقويم الأسنان", PPE:"الملابس ومستلزمات الوقاية",
  Periodontics:"اللثة", Medical:"طبي"
};

const WHATSAPP_NUMBER = "972597879152";

const $ = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", init);

async function init(){
  try{
    const response = await fetch("data/products.json");
    if(!response.ok) throw new Error("products.json not found");
    products = await response.json();

    $("heroProductCount").textContent = products.length;
    $("productCount").textContent = `${products.length} منتج`;

    renderCategories();
    renderFeatured();
    renderProducts(filterProducts());
    bindEvents();
    updateCart();
  }catch(error){
    console.error(error);
    $("productsGrid").innerHTML = `<div class="empty-state"><h3>تعذر تحميل المنتجات</h3><p>تأكد من رفع مجلد data مع الموقع.</p></div>`;
  }
}

function bindEvents(){
  $("cartButton").addEventListener("click", openCart);
  $("floatingCart").addEventListener("click", openCart);
  $("closeCart").addEventListener("click", closeCart);
  $("overlay").addEventListener("click", closeCart);
  $("checkoutButton").addEventListener("click", openCheckout);
  $("closeCheckout").addEventListener("click", closeCheckout);
  $("orderForm").addEventListener("submit", submitOrder);
  $("resetFilters").addEventListener("click", resetFilters);
  $("showAllFeatured").addEventListener("click", ()=>{
    activeCategory="all";
    $("searchInput").value="";
    renderCategories();
    renderProducts(products);
    document.querySelector(".all-products-title").scrollIntoView({behavior:"smooth"});
  });

  $("searchInput").addEventListener("input", ()=>{
    const query = $("searchInput").value;
    $("clearSearch").style.visibility = query ? "visible" : "hidden";
    renderProducts(filterProducts(query));
  });

  $("clearSearch").addEventListener("click", ()=>{
    $("searchInput").value="";
    $("clearSearch").style.visibility="hidden";
    renderProducts(filterProducts());
    $("searchInput").focus();
  });

  $("clearSearch").style.visibility="hidden";

  document.addEventListener("keydown", e=>{
    if(e.key==="Escape"){
      closeCart();
      closeCheckout();
    }
  });
}

function renderCategories(){
  const categories = ["all", ...new Set(products.map(p=>p.category).filter(Boolean))];
  $("categoryList").innerHTML = categories.map(c=>`
    <button class="category-btn ${c===activeCategory?"active":""}" onclick="selectCategory('${escAttr(c)}')">
      ${categoryNames[c] || esc(c)}
    </button>
  `).join("");
}

function selectCategory(category){
  activeCategory=category;
  renderCategories();
  renderProducts(filterProducts($("searchInput").value));
}

function filterProducts(query=""){
  const q=query.trim().toLowerCase();
  return products.filter(p=>{
    const categoryOK = activeCategory==="all" || p.category===activeCategory;
    const searchable = [
      p.name,p.name_ar,p.brand,p.sku,p.category,p.subcategory,p.description,
      p.size,p.quantity,...(p.keywords||[])
    ].join(" ").toLowerCase();
    return categoryOK && (!q || searchable.includes(q));
  });
}

function renderFeatured(){
  const featured=products.filter(p=>p.featured).slice(0,8);
  const block=$("featuredBlock");
  if(!featured.length){ block.classList.add("hidden"); return; }
  $("featuredProducts").innerHTML=featured.map(productCard).join("");
}

function renderProducts(list){
  $("productCount").textContent=`${list.length} منتج`;
  $("productsGrid").innerHTML=list.map(productCard).join("");
  $("emptyState").classList.toggle("hidden", list.length>0);
  $("productsGrid").classList.toggle("hidden", list.length===0);
}

function productCard(p){
  const out=p.stock==="out";
  const price=p.price==null ? "السعر عند الطلب" : `${p.price} ₪`;
  return `
    <article class="product-card">
      <div class="product-image">
        <img src="${escAttr(p.image)}" alt="${escAttr(p.name)}" loading="lazy"
             onerror="this.src='images/placeholder.svg'">
        ${out?`<span class="stock-badge out">غير متوفر</span>`:
          `<span class="stock-badge">متوفر</span>`}
      </div>
      <div class="product-info">
        <small>${esc(categoryNames[p.category]||p.category||"")}</small>
        <h3>${esc(p.name)}</h3>
        <p class="arabic-name">${esc(p.name_ar||"")}</p>
        ${p.size?`<p class="product-pack">${esc(p.size)}</p>`:""}
        <div class="product-bottom">
          <strong>${price}</strong>
          <button class="add-button" ${out||p.price==null?"disabled":""}
                  onclick="addToCart('${escAttr(p.id)}')">
            ${out?"غير متوفر":"+ إضافة"}
          </button>
        </div>
      </div>
    </article>`;
}

function addToCart(id){
  const p=products.find(x=>x.id===id);
  if(!p || p.stock==="out" || p.price==null) return;
  const item=cart.find(x=>x.id===id);
  if(item) item.quantity++;
  else cart.push({id,quantity:1});
  saveCart();
  showToast(`✓ تمت إضافة ${p.name}`);
}

function changeQty(id,delta){
  const item=cart.find(x=>x.id===id);
  if(!item) return;
  item.quantity+=delta;
  if(item.quantity<=0) cart=cart.filter(x=>x.id!==id);
  saveCart();
}

function removeItem(id){
  cart=cart.filter(x=>x.id!==id);
  saveCart();
}

function saveCart(){
  localStorage.setItem("acaciaCart",JSON.stringify(cart));
  updateCart();
}

function cartDetails(){
  return cart.map(item=>{
    const product=products.find(p=>p.id===item.id);
    return product ? {...item,product,subtotal:(product.price||0)*item.quantity}:null;
  }).filter(Boolean);
}

function cartCount(){
  return cart.reduce((sum,x)=>sum+x.quantity,0);
}

function cartTotal(){
  return cartDetails().reduce((sum,x)=>sum+x.subtotal,0);
}

function updateCart(){
  const count=cartCount(), total=cartTotal();
  $("cartCount").textContent=count;
  $("floatingCartCount").textContent=count;
  $("floatingCartTotal").textContent=`${total} ₪`;
  $("cartTotal").textContent=`${total} ₪`;
  $("checkoutButton").disabled=count===0;

  const details=cartDetails();
  $("cartEmpty").classList.toggle("hidden",details.length>0);
  $("cartItems").classList.toggle("hidden",details.length===0);

  $("cartItems").innerHTML=details.map(x=>`
    <div class="cart-item">
      <div>
        <h4>${esc(x.product.name)}</h4>
        <small>${esc(x.product.name_ar||"")}</small>
        <div class="qty-controls">
          <button onclick="changeQty('${escAttr(x.id)}',-1)" aria-label="نقص">−</button>
          <b>${x.quantity}</b>
          <button onclick="changeQty('${escAttr(x.id)}',1)" aria-label="زد">+</button>
          <button class="remove-item" onclick="removeItem('${escAttr(x.id)}')">حذف</button>
        </div>
      </div>
      <div class="cart-price">${x.subtotal} ₪</div>
    </div>
  `).join("");

  if($("checkoutModal") && !$("checkoutModal").classList.contains("hidden")){
    updateCheckoutSummary();
  }
}

function openCart(){
  $("cartDrawer").classList.add("open");
  $("overlay").classList.remove("hidden");
  document.body.style.overflow="hidden";
}

function closeCart(){
  $("cartDrawer").classList.remove("open");
  $("overlay").classList.add("hidden");
  if($("checkoutModal").classList.contains("hidden")) document.body.style.overflow="";
}

function openCheckout(){
  if(cartCount()===0) return;
  updateCheckoutSummary();
  closeCart();
  $("checkoutModal").classList.remove("hidden");
  document.body.style.overflow="hidden";
}

function closeCheckout(){
  $("checkoutModal").classList.add("hidden");
  document.body.style.overflow="";
}

function updateCheckoutSummary(){
  $("checkoutItemsCount").textContent=cartCount();
  $("checkoutTotal").textContent=`${cartTotal()} ₪`;
}

function submitOrder(event){
  event.preventDefault();
  const form=event.target;
  const data={
    doctor:$("doctorName").value.trim(),
    clinic:$("clinicName").value.trim(),
    phone:$("phone").value.trim(),
    city:$("city").value.trim(),
    address:$("address").value.trim(),
    notes:$("notes").value.trim()
  };

  const required=[["doctor","اسم الطبيب"],["clinic","اسم العيادة"],["phone","رقم الهاتف"],["city","المدينة"],["address","العنوان"]];
  const missing=required.filter(([key])=>!data[key]);
  if(missing.length){
    $("formError").textContent=`يرجى تعبئة: ${missing.map(x=>x[1]).join("، ")}`;
    $("formError").classList.remove("hidden");
    return;
  }
  $("formError").classList.add("hidden");

  const lines=[];
  lines.push("🦷 *طلب جديد من موقع أكاسيا*");
  lines.push("");
  lines.push(`👨‍⚕️ الطبيب: ${data.doctor}`);
  lines.push(`🏥 العيادة: ${data.clinic}`);
  lines.push(`📞 الهاتف: ${data.phone}`);
  lines.push(`📍 المدينة: ${data.city}`);
  lines.push(`📍 العنوان: ${data.address}`);
  lines.push("");
  lines.push("━━━━━━━━━━━━━━");
  lines.push("");
  lines.push("🛒 *المنتجات:*");
  lines.push("");

  cartDetails().forEach((x,i)=>{
    lines.push(`${i+1}. ${x.product.name}`);
    if(x.product.name_ar) lines.push(`   ${x.product.name_ar}`);
    lines.push(`   الكمية: ${x.quantity}`);
    lines.push(`   السعر: ${x.subtotal} ₪`);
    lines.push("");
  });

  lines.push("━━━━━━━━━━━━━━");
  lines.push(`📦 عدد القطع: ${cartCount()}`);
  lines.push(`💰 *الإجمالي: ${cartTotal()} ₪*`);
  if(data.notes) lines.push("");
  if(data.notes) lines.push(`📝 ملاحظات: ${data.notes}`);
  lines.push("");
  lines.push("أرغب بتأكيد الطلب.");

  const url=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
  window.open(url,"_blank","noopener,noreferrer");
  showToast("✓ تم تجهيز الطلب في واتساب");
}

function resetFilters(){
  activeCategory="all";
  $("searchInput").value="";
  $("clearSearch").style.visibility="hidden";
  renderCategories();
  renderProducts(products);
}

function showToast(message){
  const toast=$("toast");
  toast.textContent=message;
  toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer=setTimeout(()=>toast.classList.remove("show"),2200);
}

function esc(value){
  return String(value??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
function escAttr(value){return esc(value);}
