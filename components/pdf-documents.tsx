import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { WorksheetQuestion } from '@/lib/worksheet';

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 12, fontFamily: 'Helvetica' },
  heading: { fontSize: 18, marginBottom: 6 },
  sectionHeading: { fontSize: 13, marginBottom: 4, marginTop: 12 },
  helper: { fontSize: 10, color: '#4b5563', marginBottom: 10 },
  line: { marginBottom: 8 },
  options: { marginLeft: 10 }
});

export function WorksheetDocument({
  listName,
  generatedAt,
  questions,
  definitions
}: {
  listName: string;
  generatedAt: string;
  questions: WorksheetQuestion[];
  definitions: { word: string; definition: string }[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>{listName} - Student Worksheet</Text>
        <Text style={styles.helper}>Generated {new Date(generatedAt).toLocaleString()}</Text>

        <Text style={styles.sectionHeading}>Activity 1: Multiple Choice Spelling</Text>
        {questions.map((item, index) => (
          <View key={`${item.word}-${index}`} style={styles.line}>
            <Text>{`${index + 1}. ${item.definition}`}</Text>
            <View style={styles.options}>
              {item.options.map((option) => (
                <Text key={`${item.word}-${option}`}>- {option}</Text>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.sectionHeading}>Activity 2: Definitions</Text>
        {definitions.map((entry, index) => (
          <Text key={`${entry.word}-${index}`} style={styles.line}>
            {`${index + 1}. ${entry.word}: ${entry.definition}`}
          </Text>
        ))}
      </Page>
    </Document>
  );
}

export function AnswerKeyDocument({
  listName,
  generatedAt,
  questions
}: {
  listName: string;
  generatedAt: string;
  questions: WorksheetQuestion[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>{listName} - Answer Key</Text>
        <Text style={styles.helper}>Generated {new Date(generatedAt).toLocaleString()}</Text>
        {questions.map((item, index) => (
          <View key={`${item.word}-${index}`} style={styles.line}>
            <Text>{`${index + 1}. Correct spelling: ${item.answer}`}</Text>
            <Text>{`Definition: ${item.definition}`}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
