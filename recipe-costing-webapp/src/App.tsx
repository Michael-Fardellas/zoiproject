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
          <h1>Recipe Costing</h1>
          <small>Ingredients, recipes, menu items. Local storage only.</small>
        </div>
        <FileButtons
          data={data}
          onImport={(imported) => setData(imported)}
          onReset={() => setData({ ingredients: [], recipes: [], menuItems: [], schemaVersion: 1, exportedAt: new Date().toISOString() })}
        />
      </div>

      <div className="tabs noPrint">
        <button className={'tab ' + (tab === 'Ingredients' ? 'active' : '')} onClick={() => setTab('Ingredients')}>Ingredients</button>
        <button className={'tab ' + (tab === 'Recipes' ? 'active' : '')} onClick={() => setTab('Recipes')}>Recipes</button>
        <button className={'tab ' + (tab === 'Menu' ? 'active' : '')} onClick={() => setTab('Menu')}>Menu Items</button>
        <button className={'tab ' + (tab === 'Reports' ? 'active' : '')} onClick={() => setTab('Reports')}>Reports</button>
      </div>

      {tab === 'Ingredients' ? <IngredientsTab ingredients={data.ingredients} setIngredients={setIngredients} /> : null}
      {tab === 'Recipes' ? <RecipesTab ingredients={data.ingredients} recipes={data.recipes} setRecipes={setRecipes} /> : null}
      {tab === 'Menu' ? <MenuItemsTab ingredients={data.ingredients} recipes={data.recipes} menuItems={data.menuItems} setMenuItems={setMenuItems} /> : null}
      {tab === 'Reports' ? <ReportsTab ingredients={data.ingredients} recipes={data.recipes} menuItems={data.menuItems} /> : null}

      <div className="muted" style={{ marginTop: 14 }}>
        Units must match exactly. If you need density conversions (ml to g), that is an extra feature.
      </div>
    </div>
  )
}
