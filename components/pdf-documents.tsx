import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { MatchingData, WorksheetQuestion } from '@/lib/worksheet';

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 12, fontFamily: 'Helvetica' },
  heading: { fontSize: 18, marginBottom: 6 },
  sectionHeading: { fontSize: 13, marginBottom: 4, marginTop: 12 },
  helper: { fontSize: 10, color: '#4b5563', marginBottom: 10 },
  line: { marginBottom: 10 },
  options: { marginLeft: 10 },
  answerLine: { marginTop: 4 },
  wordEntry: { marginBottom: 4 },
  defEntry: { marginBottom: 10 }
});

export function WorksheetDocument({
  listName,
  generatedAt,
  questions,
  matching
}: {
  listName: string;
  generatedAt: string;
  questions: WorksheetQuestion[];
  matching: MatchingData;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>{listName} - Student Worksheet</Text>
        <Text style={styles.helper}>Generated {new Date(generatedAt).toLocaleString()}</Text>

        <Text style={styles.sectionHeading}>Activity 1: Select Correct Spelling</Text>
        {questions.map((item, index) => (
          <View key={`${item.word}-${index}`} style={styles.line}>
            <Text>{`${index + 1}. ${item.definition}`}</Text>
            <View style={styles.options}>
              {item.options.map((option) => (
                <Text key={`${item.word}-${option}`}>- {option}</Text>
              ))}
            </View>
            <Text style={styles.answerLine}>Write the correct spelling: __________________________</Text>
          </View>
        ))}

        <Text style={styles.sectionHeading}>Activity 2: Match Words to Definitions</Text>

        <Text style={[styles.sectionHeading, { fontSize: 11 }]}>Words</Text>
        {matching.words.map((word, index) => (
          <Text key={`word-${index}`} style={styles.wordEntry}>{`${index + 1}. ${word}`}</Text>
        ))}

        <Text style={[styles.sectionHeading, { fontSize: 11 }]}>Definitions</Text>
        {matching.definitions.map((entry) => (
          <View key={`def-${entry.letter}`} style={styles.defEntry}>
            <Text>{`${entry.letter}. ${entry.definition}`}</Text>
            <Text>Word: __________________________</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export function AnswerKeyDocument({
  listName,
  generatedAt,
  questions,
  matching
}: {
  listName: string;
  generatedAt: string;
  questions: WorksheetQuestion[];
  matching: MatchingData;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>{listName} - Answer Key</Text>
        <Text style={styles.helper}>Generated {new Date(generatedAt).toLocaleString()}</Text>

        <Text style={styles.sectionHeading}>Activity 1: Select Correct Spelling</Text>
        {questions.map((item, index) => (
          <View key={`${item.word}-${index}`} style={styles.line}>
            <Text>{`${index + 1}. Correct spelling: ${item.answer}`}</Text>
            <Text>{`Definition: ${item.definition}`}</Text>
          </View>
        ))}

        <Text style={styles.sectionHeading}>Activity 2: Match Words to Definitions</Text>
        {matching.definitions.map((entry) => (
          <View key={`ans-${entry.letter}`} style={styles.line}>
            <Text>{`${entry.letter}. ${entry.definition}`}</Text>
            <Text>{`Answer: ${matching.answers[entry.letter]}`}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
