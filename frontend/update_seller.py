import os

file_path = r"C:\Users\geeta\.gemini\antigravity-ide\scratch\ai-marketplace\frontend\src\pages\SellerDashboard.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Insert handlePromoteProduct
if "handlePromoteProduct" not in content:
    hook_str = "  const handleOpenEditModal = (product) => {"
    promote_func = """  const handlePromoteProduct = async (product_id) => {
    if (!window.confirm("Promote this product for 100 Style Coins?")) return;
    try {
      const res = await fetch(`${API_URL}/seller/promote/${product_id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        // Refresh seller data to update coins and product list
        fetchSellerData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Connection failed');
    }
  };

"""
    content = content.replace(hook_str, promote_func + hook_str)

# 2. Add Style Coins to Dashboard stats
stats_old = """      {/* Grid: Top Stats row */}
      {stats && (
        <div style={styles.statsRow}>
          <div style={styles.statsCard} className="glass-panel">
            <span style={styles.statsLabel}>Total Earnings</span>
            <h3 style={styles.statsVal}>₹{stats.total_sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div style={styles.statsCard} className="glass-panel">
            <span style={styles.statsLabel}>Orders Processed</span>
            <h3 style={styles.statsVal}>{stats.order_count}</h3>
          </div>"""

stats_new = """      {/* Grid: Top Stats row */}
      {stats && (
        <div style={styles.statsRow}>
          <div style={styles.statsCard} className="glass-panel">
            <span style={styles.statsLabel}>Total Earnings</span>
            <h3 style={styles.statsVal}>₹{stats.total_sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div style={styles.statsCard} className="glass-panel">
            <span style={styles.statsLabel}>Style Coins</span>
            <h3 style={{...styles.statsVal, color: 'gold'}}>{user?.coins || 0}</h3>
          </div>
          <div style={styles.statsCard} className="glass-panel">
            <span style={styles.statsLabel}>Orders Processed</span>
            <h3 style={styles.statsVal}>{stats.order_count}</h3>
          </div>"""
content = content.replace(stats_old, stats_new)

# 3. Add Promote button in table
button_old = """                    <td style={styles.td}>
                      <button
                        onClick={() => handleOpenEditModal(p)}"""
button_new = """                    <td style={styles.td}>
                      {!p.is_promoted && (
                        <button
                          onClick={() => handlePromoteProduct(p.id)}
                          className="btn-primary"
                          style={{...styles.editBtn, background: 'linear-gradient(90deg, #ff8a00, #e52e71)', border: 'none', marginBottom: '8px'}}
                          title="Promote Product"
                        >
                          ⚡ Promote
                        </button>
                      )}
                      <br/>
                      <button
                        onClick={() => handleOpenEditModal(p)}"""
content = content.replace(button_old, button_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("SellerDashboard.jsx updated successfully")
