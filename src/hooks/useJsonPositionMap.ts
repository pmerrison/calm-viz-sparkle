import { useMemo } from 'react';
import { parse } from 'json-source-map';

export interface SourcePosition {
  line: number;
  column: number;
  pos: number;
}

export interface SourceLocation {
  value?: SourcePosition;
  valueEnd?: SourcePosition;
  // Legacy format support
  start?: SourcePosition;
  end?: SourcePosition;
}

export interface PositionMap {
  nodes: Map<string, SourceLocation>;
  relationships: Map<string, SourceLocation>;
}

/**
 * Hook to build a map of node/relationship IDs to their positions in the JSON source
 */
export const useJsonPositionMap = (jsonString: string): PositionMap => {
  return useMemo(() => {
    const map: PositionMap = {
      nodes: new Map(),
      relationships: new Map(),
    };

    try {
      const result = parse(jsonString);
      const { data, pointers } = result;

      // Map nodes by their unique-id
      if (data.nodes && Array.isArray(data.nodes)) {
        data.nodes.forEach((node: any, index: number) => {
          const nodeId = node['unique-id'] || node.unique_id || node.id;
          if (nodeId) {
            const pointer = `/nodes/${index}`;
            const location = pointers[pointer];

            if (location) {
              map.nodes.set(nodeId, location);
            }
          }
        });
      }

      // Map relationships by their unique-id
      if (data.relationships && Array.isArray(data.relationships)) {
        data.relationships.forEach((rel: any, index: number) => {
          const relId = rel['unique-id'] || rel.unique_id || rel.id;
          if (relId) {
            const pointer = `/relationships/${index}`;
            const location = pointers[pointer];

            if (location) {
              map.relationships.set(relId, location);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error building position map:', error);
    }

    return map;
  }, [jsonString]);
};
