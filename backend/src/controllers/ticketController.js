const Ticket = require('../models/Ticket');

exports.createTicket = async (req, res) => {
  try {
    const { subject, description } = req.body;
    if (!subject || !description) {
      return res.status(400).json({ message: 'Subject and description are required' });
    }

    const ticket = await Ticket.create({
      userId: req.user._id,
      subject,
      description
    });

    res.status(201).json({ message: 'Support ticket raised successfully', ticket });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create ticket', error: err.message });
  }
};

exports.getUserTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(tickets);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch tickets', error: err.message });
  }
};

exports.adminGetTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate('userId', 'name email phone role')
      .sort({ createdAt: -1 });
    res.status(200).json(tickets);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch tickets', error: err.message });
  }
};

exports.adminUpdateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['open', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const ticket = await Ticket.findByIdAndUpdate(id, { status }, { new: true }).populate('userId', 'name email phone role');
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.status(200).json({ message: 'Ticket status updated', ticket });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update ticket status', error: err.message });
  }
};
