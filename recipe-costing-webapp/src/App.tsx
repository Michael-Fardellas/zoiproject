import React from 'react'
import type { AppData } from './types'
import { loadAll, saveAll } from './lib/storage'
import { IngredientsTab } from './components/Ingredients'
import { MenuItemsTab } from './components/MenuItems'
import { ReportsTab } from './components/Reports'
import { FileButtons } from './components/FileButtons'

type Tab = 'Ingredients' | 'Menu' | 'Reports'

export default function App() {
  const [tab, setTab] = React.useState<Tab>('Menu')
  const [data, setData] = React.useState<AppData>(() => loadAll())

  React.useEffect(() => { saveAll(data) }, [data])

  const setIngredients = (ingredients: AppData['ingredients']) => setData({ ...data, ingredients })
  const setMenuItems = (menuItems: AppData['menuItems']) => setData({ ...data, menuItems })

  return (
    <div className="app">
      <div className="topbar noPrint">
        <div className="brand">
          <h1>Πρόγραμμα Κοστολόγησης Πιάτων</h1>
          <small>Φόρτωσε Excel ή πρόσθεσε χειροκίνητα υλικά &amp; πιάτα. Όλα αποθηκεύονται μόνο σε αυτή τη συσκευή.</small>
        </div>
        <FileButtons
          data={data}
          onImport={(imported) => setData(imported)}
          onReset={() => setData({ ingredients: [], recipes: [], menuItems: [], schemaVersion: 1, exportedAt: new Date().toISOString() })}
        />
      </div>

      <div className="tabs noPrint">
        <button className={'tab ' + (tab === 'Menu' ? 'active' : '')} onClick={() => setTab('Menu')}>Πιάτα</button>
        <button className={'tab ' + (tab === 'Ingredients' ? 'active' : '')} onClick={() => setTab('Ingredients')}>Υλικά</button>
        <button className={'tab ' + (tab === 'Reports' ? 'active' : '')} onClick={() => setTab('Reports')}>PDF &amp; Αναφορές</button>
      </div>

      <div className="infoStrip noPrint">
        Δημιούργησε πιάτα με υλικά ή φόρτωσε ένα Excel. Το πρόγραμμα υπολογίζει συνολικά γραμμάρια, κόστος και προτεινόμενη τιμή και τα στέλνει για PDF εκτύπωση.
      </div>

      {tab === 'Menu' ? <MenuItemsTab ingredients={data.ingredients} recipes={data.recipes} menuItems={data.menuItems} setMenuItems={setMenuItems} /> : null}
      {tab === 'Ingredients' ? <IngredientsTab ingredients={data.ingredients} setIngredients={setIngredients} /> : null}
      {tab === 'Reports' ? <ReportsTab ingredients={data.ingredients} recipes={data.recipes} menuItems={data.menuItems} /> : null}

      <div className="muted" style={{ marginTop: 14 }}>
        Χρησιμοποίησε την ίδια μονάδα μέτρησης παντού (γρ / ml / τεμ). Για μετατροπές πυκνότητας (ml σε γρ) χρειάζεται ξεχωριστός υπολογισμός.
      </div>
    </div>
  )
}
