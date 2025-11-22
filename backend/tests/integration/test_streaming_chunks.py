"""Integration test for LLM streaming chunks."""

import pytest
import asyncio
import json
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.database import Project, ChatSession, AgentConfiguration


@pytest.mark.asyncio
@pytest.mark.websocket
async def test_streaming_chunks_displayed_correctly(db_session: AsyncSession):
    """Test that LLM streaming chunks are displayed as text, not as separate actions."""

    # Create test project
    project = Project(name="Test Streaming", description="Test streaming chunks")
    db_session.add(project)
    await db_session.flush()

    # Create agent configuration
    agent_config = AgentConfiguration(
        project_id=project.id,
        agent_type="code_agent",
        enabled_tools=[],  # No tools - simple chat mode
        llm_provider="openai",
        llm_model="gpt-4",
        llm_config={"temperature": 1.0, "max_tokens": 16384},
    )
    db_session.add(agent_config)
    await db_session.flush()

    # Create chat session
    session = ChatSession(
        project_id=project.id,
        name="Test Session",
    )
    db_session.add(session)
    await db_session.commit()

    # Mock LLM provider to return streaming chunks
    async def mock_generate_stream(*args, **kwargs):
        """Mock LLM that streams word by word."""
        # Simulate streaming response: "Hello, this is a test response from the LLM."
        words = ["Hello", ", ", "this", " ", "is", " ", "a", " ", "test", " ", "response", " ", "from", " ", "the", " ", "LLM", "."]
        for word in words:
            await asyncio.sleep(0.01)  # Simulate streaming delay
            yield word

    with patch('app.core.llm.provider.LLMProvider.generate_stream', new=mock_generate_stream):
        # Connect to WebSocket
        with TestClient(app).websocket_connect(f"/api/v1/chats/{session.id}/stream") as websocket:
            # Send a message
            websocket.send_json({
                "type": "message",
                "content": "Hello, how are you?"
            })

            # Collect all events
            events = []
            max_events = 50  # Safety limit

            for _ in range(max_events):
                try:
                    data = websocket.receive_json()
                    events.append(data)

                    # Break on 'end' event
                    if data.get("type") == "end":
                        break

                except Exception as e:
                    pytest.fail(f"Failed to receive WebSocket message: {e}")
                    break

            # Verify events
            print("\n=== Received Events ===")
            for i, event in enumerate(events):
                print(f"{i}: {event}")

            # Should have: start, user_message_saved, multiple chunks, end
            event_types = [e.get("type") for e in events]

            # Verify we got a start event
            assert "start" in event_types, "Should have received 'start' event"

            # Verify we got chunk events (NOT thought events)
            chunk_events = [e for e in events if e.get("type") == "chunk"]
            thought_events = [e for e in events if e.get("type") == "thought"]

            print(f"\nChunk events: {len(chunk_events)}")
            print(f"Thought events: {len(thought_events)}")

            # THIS IS THE KEY ASSERTION:
            # In simple chat mode (no tools), all streaming text should be 'chunk' events, not 'thought' events
            assert len(chunk_events) > 0, "Should have received chunk events for streaming text"
            assert len(thought_events) == 0, "Should NOT have thought events in simple chat mode (these appear as actions in UI)"

            # Verify we can reconstruct the full message from chunks
            full_message = "".join([e.get("content", "") for e in chunk_events])
            expected = "Hello, this is a test response from the LLM."
            assert full_message == expected, f"Reconstructed message should match. Got: {full_message}"

            # Verify we got an end event
            assert "end" in event_types, "Should have received 'end' event"


@pytest.mark.asyncio
@pytest.mark.websocket
async def test_agent_mode_thought_vs_chunks(db_session: AsyncSession):
    """Test that in agent mode, thoughts are buffered and final answer is streamed as chunks."""

    # Create test project
    project = Project(name="Test Agent Streaming", description="Test agent streaming")
    db_session.add(project)
    await db_session.flush()

    # Create agent configuration WITH tools (agent mode)
    agent_config = AgentConfiguration(
        project_id=project.id,
        agent_type="code_agent",
        enabled_tools=["bash", "file_read"],  # Has tools - agent mode
        llm_provider="openai",
        llm_model="gpt-4",
        llm_config={"temperature": 1.0, "max_tokens": 16384},
    )
    db_session.add(agent_config)
    await db_session.flush()

    # Create chat session
    session = ChatSession(
        project_id=project.id,
        name="Test Agent Session",
        environment_type="python3.11",  # Has environment set up
        environment_config={},
    )
    db_session.add(session)
    await db_session.commit()

    # Mock LLM provider to return final answer without function call
    async def mock_generate_stream(*args, **kwargs):
        """Mock LLM that returns final answer (no function call)."""
        # Simulate streaming final answer
        words = ["The", " ", "task", " ", "has", " ", "been", " ", "completed", "."]
        for word in words:
            await asyncio.sleep(0.01)
            yield word

    # Mock container manager
    with patch('app.core.llm.provider.LLMProvider.generate_stream', new=mock_generate_stream), \
         patch('app.core.sandbox.manager.get_container_manager') as mock_container_mgr:

        # Mock container
        mock_container = MagicMock()
        mock_container_mgr.return_value.get_container = AsyncMock(return_value=mock_container)

        # Connect to WebSocket
        with TestClient(app).websocket_connect(f"/api/v1/chats/{session.id}/stream") as websocket:
            # Send a message
            websocket.send_json({
                "type": "message",
                "content": "Please complete this task"
            })

            # Collect all events
            events = []
            max_events = 50  # Safety limit

            for _ in range(max_events):
                try:
                    data = websocket.receive_json()
                    events.append(data)

                    if data.get("type") == "end" or data.get("type") == "error":
                        break

                except Exception:
                    break

            # Verify events
            print("\n=== Agent Mode Events ===")
            for i, event in enumerate(events):
                print(f"{i}: {event}")

            # Get event types
            event_types = [e.get("type") for e in events]
            chunk_events = [e for e in events if e.get("type") == "chunk"]
            thought_events = [e for e in events if e.get("type") == "thought"]

            print(f"\nChunk events: {len(chunk_events)}")
            print(f"Thought events: {len(thought_events)}")

            # In agent mode, when providing final answer:
            # - Thoughts should NOT be streamed word-by-word to UI (these become visual "action" blocks)
            # - Final answer should be streamed as chunks

            # The final answer should be sent as chunks, not thoughts
            assert len(chunk_events) > 0, "Final answer should be streamed as chunks"

            # Reconstruct final answer
            full_message = "".join([e.get("content", "") for e in chunk_events])
            expected = "The task has been completed."
            assert full_message == expected, f"Final answer should match. Got: {full_message}"
