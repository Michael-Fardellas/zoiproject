import React from 'react'
import type { AppData } from './types'
import { loadAll, saveAll } from './lib/storage'
import { IngredientsTab } from './components/Ingredients'
import { RecipesTab } from './components/Recipes'
import { MenuItemsTab } from './components/MenuItems'
import { ReportsTab } from './components/Reports'
import { FileButtons } from './components/FileButtons'

type Tab = 'Ingredients' | 'Recipes' | 'Menu' | 'Reports'

export default function App() {
  const [tab, setTab] = React.useState<Tab>('Ingredients')
  const [data, setData] = React.useState<AppData>(() => loadAll())

  React.useEffect(() => { saveAll(data) }, [data])

  const setIngredients = (ingredients: AppData['ingredients']) => setData({ ...data, ingredients })
  const setRecipes = (recipes: AppData['recipes']) => setData({ ...data, recipes })
  const setMenuItems = (menuItems: AppData['menuItems']) => setData({ ...data, menuItems })

  return (
    <div className="app">
      <div className="topbar noPrint">
        <div className="brand">
          <h1>ΠΡΟΓΡΑΜΜΑ ΓΙΑ ΣΥΝΤΑΓΕΣ ΖΩΗ</h1>
          <small>Απλές λίστες υλικών, συνταγών και πιάτων. Όλα αποθηκεύονται μόνο σε αυτή τη συσκευή.</small>
        </div>
        <FileButtons
          data={data}
          onImport={(imported) => setData(imported)}
          onReset={() => setData({ ingredients: [], recipes: [], menuItems: [], schemaVersion: 1, exportedAt: new Date().toISOString() })}
        />
      </div>

      <div className="tabs noPrint">
        <button className={'tab ' + (tab === 'Ingredients' ? 'active' : '')} onClick={() => setTab('Ingredients')}>Υλικά</button>
        <button className={'tab ' + (tab === 'Recipes' ? 'active' : '')} onClick={() => setTab('Recipes')}>Συνταγές</button>
        <button className={'tab ' + (tab === 'Menu' ? 'active' : '')} onClick={() => setTab('Menu')}>Πιάτα & Μερίδες</button>
        <button className={'tab ' + (tab === 'Reports' ? 'active' : '')} onClick={() => setTab('Reports')}>Αναφορές</button>
      </div>

      <div className="infoStrip noPrint">
        1) Καταχώρησε τα υλικά με τιμές. 2) Σύνδεσε τα υλικά σε συνταγές. 3) Δες κόστος και προτεινόμενες τιμές για τα πιάτα σου.
      </div>

      {tab === 'Ingredients' ? <IngredientsTab ingredients={data.ingredients} setIngredients={setIngredients} /> : null}
      {tab === 'Recipes' ? <RecipesTab ingredients={data.ingredients} recipes={data.recipes} setRecipes={setRecipes} /> : null}
      {tab === 'Menu' ? <MenuItemsTab ingredients={data.ingredients} recipes={data.recipes} menuItems={data.menuItems} setMenuItems={setMenuItems} /> : null}
      {tab === 'Reports' ? <ReportsTab ingredients={data.ingredients} recipes={data.recipes} menuItems={data.menuItems} /> : null}

      <div className="muted" style={{ marginTop: 14 }}>
        Χρησιμοποίησε την ίδια μονάδα μέτρησης παντού (γρ / ml / τεμ). Για μετατροπές πυκνότητας (ml σε γρ) χρειάζεται ξεχωριστός υπολογισμός.
      </div>
    </div>
  )
}
