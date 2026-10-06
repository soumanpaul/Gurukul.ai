import { Text } from 'react-native';
import { Card, styles } from '../shared/ui';

export function StudyScreen() {
  return <Card>
    <Text style={styles.heading}>Study your selected notes</Text>
    <Text style={styles.body}>Open Home → notebook → Study to ask, explain or summarize a selected section. History and page-linked citations stay with that notebook.</Text>
    <Text style={styles.note}>Native model/OCR feasibility checks remain available in Settings → T0 diagnostics. They use synthetic material, not your notebooks.</Text>
  </Card>;
}
