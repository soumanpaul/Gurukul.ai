import { Text } from 'react-native';
import type { Notebook } from '../../adapters/sqlite/repository';
import { syntheticNotebook } from '../../domain/fixtures';
import { Card, styles } from '../shared/ui';

export function NotebooksScreen({ notebooks }: { notebooks: Notebook[] }) {
  return <>
    <Text style={styles.heading}>Your local notebooks</Text>
    <Text style={styles.body}>This foundation includes one clearly labeled sample. Import and notebook creation arrive in T3.</Text>
    {notebooks.length === 0 && <Text style={styles.note}>No notebooks saved. Nothing was automatically recreated or reset.</Text>}
    {notebooks.map(notebook => <Card key={notebook.id}>
      <Text style={styles.heading}>{notebook.title}</Text>
      {notebook.id === syntheticNotebook.id && <>
        <Text style={styles.body}>{syntheticNotebook.text}</Text>
        <Text style={styles.note}>{syntheticNotebook.provenance}</Text>
      </>}
    </Card>)}
  </>;
}
